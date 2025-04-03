import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {FormProvider, useForm} from "react-hook-form";
import {FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {z} from "zod";
import {zodResolver} from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { PopoverTrigger,Popover,PopoverContent} from '@/components/ui/popover'
import { cn } from "../NavigationButton";
import {format} from "date-fns";
import {CalendarIcon} from "lucide-react";
import {Calendar} from "@/components/ui/calendar";
import { de } from "date-fns/locale/de";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";

export const GeburtstagAdresseEdit = ()=>{
    const {t} = useTranslation()
    const birthdayAddress = z.object({
        birthday: z.date().optional(),
        country: z.string().optional(),
        plz: z.number().optional(),
        city: z.string().optional(),
        street: z.string().optional(),
    })


    const birthdayForm = useForm<z.infer<typeof birthdayAddress>>({
        resolver: zodResolver(birthdayAddress),
        defaultValues: {
        },
    })

    const onSubmitOfUser = (values: z.infer<typeof birthdayAddress>)=>{
        //updateUser.mutate(values)
    }


    return    <Card className="bg-gray-700 text-white">
        <CardHeader className="border-b-2 border-gray-600 bg-accentDark">
            <CardTitle>Geburtstag und Adresse</CardTitle>
        </CardHeader>
        <CardContent>
            <FormProvider {...birthdayForm}>
                <form onSubmit={birthdayForm.handleSubmit(onSubmitOfUser)} className="space-y-8">
                    <div  className="grid grid-cols-1 gap-5">
                        <FormField
                            control={birthdayForm.control}
                            name="birthday"
                            render={({ field }) => (
                                <FormItem   className="grid-cols-2">
                                    <FormLabel>{t('birthday')}</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-[240px] bg-transparent pl-3 text-left font-normal",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    {field.value ? (
                                                        format(field.value, "PPP", {
                                                            locale: de
                                                        })
                                                    ) : (
                                                        <span>Geburtstag</span>
                                                    )}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                locale={de}
                                                mode="single"
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                disabled={(date) =>
                                                    date > new Date() || date < new Date("1900-01-01")
                                                }
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={birthdayForm.control}
                            name="country"
                            render={({ field }) => (
                                <FormItem className="grid-cols-2">
                                    <FormLabel>Land</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Land" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="m@example.com">Deutschland</SelectItem>
                                            <SelectItem value="m@google.com">Österreich</SelectItem>
                                            <SelectItem value="m@support.com">Frankreich</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={birthdayForm.control}
                            name="plz"
                            render={({ field }) => (
                                <FormItem className="grid-cols-2">
                                    <FormLabel>{t('plz')}</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={birthdayForm.control}
                            name="city"
                            render={({ field }) => (
                                <FormItem className="grid-cols-2">
                                    <FormLabel>{t('city')}</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={birthdayForm.control}
                            name="street"
                            render={({ field }) => (
                                <FormItem className="grid-cols-2">
                                    <FormLabel>{t('street')}</FormLabel>
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