import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Button} from "@/components/ui/button";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {User} from "@/src/models/User";
import axios from "axios";
import {apiURL} from "@/src/Keycloak";
import {useMemo, useRef} from "react";
import {useKeycloak} from "@/src/Keycloak/useKeycloak";

export const ProfileUploadEdit = ()=>{
    const keycloak = useKeycloak()
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const queryClient = useQueryClient();
    const uploadFile = useMutation<User, Error, ArrayBuffer>({
        mutationKey: ['uploadFile'],
        mutationFn: async (file) => {
            return await axios.post(apiURL + `/v1/users/${keycloak.subject}/profile`, file, {
                headers: {
                    'Content-Type': 'application/octet-stream',
                },
            });
        },
        onSuccess: async (result) => {
            queryClient.setQueryData(['user'], (oldData: User) => {
                return {
                    ...result,
                    profilePicUrl: oldData.profilePicUrl
                }
            })
        }
    })


    const initials = useMemo(()=>{
        if(keycloak.tokenParsed !== undefined && keycloak.tokenParsed.given_name !== undefined && keycloak.tokenParsed.family_name !== undefined){
            return `${keycloak.tokenParsed.given_name.charAt(0)}${keycloak.tokenParsed.family_name.charAt(0)}`
        }
        return ""
    }, [keycloak])

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            const file = event.target.files[0];
            const reader = new FileReader();
            reader.onload = async (e) => {
                if (e.target?.result) {
                    const arrayBuffer = e.target.result as ArrayBuffer;
                    try {
                        uploadFile.mutate(arrayBuffer);
                        window.location.reload();
                    } catch (error) {
                        console.error('Error uploading file:', error);
                    }
                }
            };
            reader.readAsArrayBuffer(file);
        }
    };
    const deleteImage = useMutation<User, Error, void>({
        mutationKey: ['deleteImage'],
        mutationFn: async () => {
            return await axios.delete(apiURL + `/v1/users/${keycloak.subject}/profile`);
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: ['user']
            })
        }
    })


    const {data, isLoading} = useQuery<User>({
        queryKey: ['user'],
        queryFn: async () => {
            return await axios.get(apiURL +"/v1/users/me").then(response=>response.data)
        },
        enabled: true
    })

    if (isLoading) {
        return <div className="flex justify-center items-center h-full">
            <i className="fa-solid fa-spinner animate-spin text-3xl"/>
        </div>
    }

    return                     <Card className="bg-gray-700 text-white">
        <CardHeader className="border-b-2 border-gray-600 bg-accentDark">
            <CardTitle>Profilbild anpassen</CardTitle>
        </CardHeader>
        <CardContent className="flex">
            <div className="relative  w-24 h-24 avatar-hover">
                <Avatar className="cursor-pointer w-24 h-24"  onClick={() => fileInputRef.current?.click()}>
                    <AvatarImage src={data?.profilePicUrl}/>
                    <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <i
                    className="cursor-pointer fa-solid fa-pencil text-transparent absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"/>
                <input
                    type="file"
                    accept="image/png, image/gif, image/jpeg"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                />
            </div>
            {data?.profilePicUrl &&<Button variant="destructive" className="cursor-pointer mt-auto ml-6" onClick={()=>{
                deleteImage.mutate()
            }}>Profilbild löschen</Button>}
        </CardContent>
    </Card>
}