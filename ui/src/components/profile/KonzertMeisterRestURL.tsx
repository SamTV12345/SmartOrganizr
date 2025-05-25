import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import {Input} from "@/components/ui/input";
import {useTranslation} from "react-i18next";
import {z} from "zod";
import {FormProvider, useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {Button} from "@/components/ui/button";
import {useMutation, useQuery} from "@tanstack/react-query";
import axios from "axios";
import {apiURL} from "@/src/Keycloak";
import {useKeycloak} from "@/src/Keycloak/useKeycloak";
import {Skeleton} from "@/components/ui/skeleton";
import {useEffect} from "react";

type UrlRequest = {
    url: string;
}

export const KonzertMeisterRestURL = ()=>{
    const {t} = useTranslation()
    const keycloak = useKeycloak()
    const {data, isLoading} = useQuery({
        queryKey: ['konzertmeisterUrl', keycloak.subject],
        queryFn: async () => {
            const response = await axios.get<{ url: string }>(apiURL + `/v1/users/${keycloak.subject}/konzertmeister-url`)
            return response.data.url
        },
        enabled: !!keycloak.subject, // Only run if subject is available
        refetchOnWindowFocus: false,
    })

    useEffect(() => {
        if (data) {
            userForm.resetField('konzertmeisterURL', {
                defaultValue: data
            })
        }
    }, [data]);

    const updateKonzertMeisterRestURL = async (req: UrlRequest) => {
        return axios.post<void, UrlRequest>(apiURL + `/v1/users/${keycloak.subject}/konzertmeister-url`, {
            url: req.url
        })
    }
    const createKonzertMeisterUrlMutation = useMutation<{}, Error, UrlRequest>({
        mutationFn: updateKonzertMeisterRestURL,
    })

    const formSchemaKonzertmeister = z.object({
        konzertmeisterURL: z.string().url({message: t('fieldMustBeUrl')!}),
    })

    const onSubmit = (data: z.infer<typeof formSchemaKonzertmeister>) => {
        createKonzertMeisterUrlMutation.mutate({
            url: data.konzertmeisterURL
        })
    }

    const userForm = useForm<z.infer<typeof formSchemaKonzertmeister>>({
        resolver: zodResolver(formSchemaKonzertmeister),
        defaultValues: {
            konzertmeisterURL: '',
        },
    })

    return <Card className="bg-gray-700 text-white">
        <CardHeader className="border-b-2 border-gray-600 bg-accentDark">
            <CardTitle>Konzertmeister URL</CardTitle>
        </CardHeader>
        <CardContent>
            <FormProvider {...userForm}>
                <form onSubmit={userForm.handleSubmit(onSubmit)} className="space-y-8">
                    {isLoading ? <Skeleton className="w-[100px] h-[20px] rounded-full"/>:
                    <FormField
                control={userForm.control}
                name="konzertmeisterURL"
                render={({ field }) => (
                    <FormItem className="grid-cols-2">
                        <FormLabel>{t('konzertmeister-url')}</FormLabel>
                        <FormControl>
                            <Input {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            /> }
                    <Button variant="default" className="float-right mt-5 bg-accentDark hover:bg-accentDarkHover cursor-pointer">{t('save')}</Button>
                </form>
            </FormProvider>
        </CardContent>
    </Card>
}
