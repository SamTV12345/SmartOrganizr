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
import {useEffect, useState} from "react";
import {Loader2} from "lucide-react";

type UrlRequest = {
    url: string;
}

export const KonzertMeisterRestURL = ()=>{
    const {t} = useTranslation()
    const keycloak = useKeycloak()
    const [syncResult, setSyncResult] = useState<string | null>(null)
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

    const syncKonzertMeisterMutation = useMutation<{ syncedEvents: number }, Error, void>({
        mutationFn: async () => {
            return await axios.post(apiURL + `/v1/users/${keycloak.subject}/konzertmeister-url/sync`)
                .then(response => response.data)
        },
        onSuccess: (data) => {
            setSyncResult(`${data.syncedEvents} ${t("eventsSynced")}`)
        },
        onError: () => {
            setSyncResult(t("syncFailed"))
        }
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

    return <Card>
        <CardHeader className="bg-muted/40 border-b">
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
                    <div className="flex flex-col gap-2 md:flex-row md:justify-end">
                        <Button variant="secondary" type="button" className="w-full md:w-auto" onClick={() => {
                            syncKonzertMeisterMutation.mutate()
                        }}>
                            {syncKonzertMeisterMutation.isPending && <Loader2 className="mr-2 animate-spin" />}
                            {t('sync-now')}
                        </Button>
                        <Button variant="default" className="w-full md:w-auto">{t('save')}</Button>
                    </div>
                    {syncResult && <p className="text-muted-foreground text-sm">{syncResult}</p>}
                </form>
            </FormProvider>
        </CardContent>
    </Card>
}
