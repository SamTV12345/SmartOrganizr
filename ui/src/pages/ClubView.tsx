import {FC} from "react";
import {useTranslation} from "react-i18next";
import {FormProvider, useForm} from "react-hook-form";
import {z} from "zod";
import {zodResolver} from "@hookform/resolvers/zod";
import {FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import {Input} from "@/components/ui/input";
import {Step} from "@/src/components/layout/Step";
import {Stepper} from "@/src/components/layout/Stepper";

type ClubProps = {

}

export const ClubView: FC<ClubProps> = ({})=>{
    const {t} = useTranslation()
    const formSchema = z.object({
        name: z.string()
    })

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
    })

    const onSubmit = ()=>{

    }

    const BaseDataStep = ()=>{
        return                         <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
                <FormItem className="grid-cols-2">
                    <FormLabel>{t('name')}</FormLabel>
                    <FormControl>
                        <Input placeholder="Amadeus" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
    }

    return <div className="md:ml-8 mt-4 md:mr-4">
        <h2 className="text-2xl font-bold">{t('create-club')}</h2>
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid">
                <Stepper>
                    <Step children={<BaseDataStep/>}>
                    </Step>
                    <Step children={<BaseDataStep/>}/>
                </Stepper>
            </form>
        </FormProvider>
    </div>
}