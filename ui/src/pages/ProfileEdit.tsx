import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/components/ui/card";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {User, UserPatchDto} from "@/src/models/User";
import axios from "axios";
import {apiURL} from "@/src/Keycloak";
import {useKeycloak} from "@/src/Keycloak/useKeycloak";
import {useEffect, useMemo, useRef} from "react";
import {Button} from "@/components/ui/button";
import {Terminal, Trash} from "lucide-react";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";
import {Link} from "@/src/components/Link";
import {accountURL} from "@/src";
import {useTranslation} from "react-i18next";
import {z} from "zod";
import {FormProvider, useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";

export const ProfileEdit = ()=> {
    const keycloak = useKeycloak()
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const queryClient = useQueryClient();
    const {t} = useTranslation()
    const {data, isLoading} = useQuery<User>({
        queryKey: ['user'],
        queryFn: async () => {
            return await axios.get(apiURL +"/v1/users/me").then(response=>response.data)
        },
        enabled: true
    })

    const updateUser = useMutation<User, Error, UserPatchDto>({
        mutationKey: ['updateUser'],
        mutationFn: async (user) => {
            return await axios.patch(apiURL + `/v1/users/${keycloak.subject}`, user, {
                headers: {
                    'Content-Type': 'application/json',
                },
            });
        },
        onSuccess: async () => {
            queryClient.setQueryData(['user'], (oldData: User) => {
                return {
                    ...oldData,
                    profilePicUrl: oldData.profilePicUrl
                }
            })
        }
    })


    const onSubmitOfUser = (values: z.infer<typeof formSchemaUser>)=>{
        console.log("Submitting user form", values)
        updateUser.mutate(values)
    }


    const formSchemaUser = z.object({
        firstname: z.string({required_error: t('fieldRequired')!}).min(1, {message: t('fieldRequired')!}),
        lastname: z.string({required_error: t('fieldRequired')!}).min(1, {message: t('fieldRequired')!}),
        email: z.string({required_error: t('fieldRequired')!}).email({message: t('emailInvalid')!}),
        username: z.string({required_error: t('fieldRequired')!}).min(1, {message: t('fieldRequired')!})
            .regex(/^[a-z]+$/, { message: "Nur Kleinbuchstaben erlaubt" })
            .refine((val) => !/\s/.test(val), { message: "Keine Leerzeichen erlaubt" }),
        telephoneNumber: z.string().optional(),
    })

    const userForm = useForm<z.infer<typeof formSchemaUser>>({
        resolver: zodResolver(formSchemaUser),
        defaultValues: {
            username: keycloak?.tokenParsed?.preferred_username,
            firstname: keycloak?.tokenParsed?.given_name,
            lastname: keycloak?.tokenParsed?.family_name,
            email: keycloak?.tokenParsed?.email,
            telephoneNumber: keycloak?.tokenParsed?.telephoneNumber
        },
    })

    useEffect(() => {
        userForm.reset({
            firstname: keycloak?.tokenParsed?.given_name,
            lastname: keycloak?.tokenParsed?.family_name,
            email: keycloak?.tokenParsed?.email,
            username: keycloak?.tokenParsed?.preferred_username,
            telephoneNumber: keycloak?.tokenParsed?.telephoneNumber
        })
    }, [keycloak.tokenParsed]);

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
                    } catch (error) {
                        console.error('Error uploading file:', error);
                    }
                }
            };
            reader.readAsArrayBuffer(file);
        }
    };


    return (
        <div className="flex flex-col items-center h-screen">
            <div className="mx-auto w-2/3 mt-10">
                <h1 className="text-2xl mb-4">Profil</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-4">
                    <Card className="bg-gray-700 text-white">
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
                    <Card className="bg-gray-700 text-white">
                        <CardHeader className="border-b-2 border-gray-600 bg-accentDark">
                            <CardTitle>Persönliche Daten</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <FormProvider {...userForm}>
                                <form onSubmit={userForm.handleSubmit(onSubmitOfUser)} className="space-y-8">
                                    <div  className="grid grid-cols-1 gap-5">
                                        <FormField
                                            control={userForm.control}
                                            name="username"
                                            render={({ field }) => (
                                                <FormItem className="grid-cols-2">
                                                    <FormLabel>{t('username')}</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={userForm.control}
                                            name="firstname"
                                            render={({ field }) => (
                                                <FormItem className="grid-cols-2">
                                                    <FormLabel>{t('firstname')}</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={userForm.control}
                                            name="lastname"
                                            render={({ field }) => (
                                                <FormItem className="grid-cols-2">
                                                    <FormLabel>{t('lastname')}</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={userForm.control}
                                            name="email"
                                            render={({ field }) => (
                                                <FormItem className="grid-cols-2">
                                                    <FormLabel>{t('email')}</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={userForm.control}
                                            name="telephoneNumber"
                                            render={({ field }) => (
                                                <FormItem className="grid-cols-2">
                                                    <FormLabel>{t('telephonenumber')}</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                <Button variant="default" className="float-right mt-5 bg-accentDark hover:bg-accentDarkHover cursor-pointer">{t('save')}</Button>
                                </form>
                            </FormProvider>
                        </CardContent>
                    </Card>
                </div>
                </div>
            </div>
        </div>
    );
}
