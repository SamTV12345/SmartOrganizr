import {useMutation, useQueryClient} from "@tanstack/react-query";
import {User, UserPatchDto} from "@/src/models/User";
import axios from "axios";
import {apiURL} from "@/src/Keycloak";
import {z} from "zod";
import {FormProvider, useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {useEffect} from "react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {useKeycloak} from "@/src/Keycloak/useKeycloak";
import {useTranslation} from "react-i18next";

export const ProfileGeneralEdit = ()=>{
    const keycloak = useKeycloak()
    const queryClient = useQueryClient();
    const {t} = useTranslation()


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
        firstname: z
            .string()
            .min(1, { message: t("fieldRequired")! }),

        lastname: z
            .string()
            .min(1, { message: t("fieldRequired")! }),

        email: z
            .string()
            .min(1, { message: t("fieldRequired")! })
            .email({ message: t("emailInvalid")! }),

        username: z
            .string()
            .min(1, { message: t("fieldRequired")! })
            .regex(/^[a-z]+$/, { message: "Nur Kleinbuchstaben erlaubt" })
            .refine((val) => !/\s/.test(val), {
                message: "Keine Leerzeichen erlaubt",
            }),

        telephoneNumber: z.string().optional(),
    });

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


    return <Card className="bg-gray-700 text-white">
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
}