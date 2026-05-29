import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { $api } from "@/src/api/client"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { visibilityOptions } from "@/src/models/clubSettings"
import { Club } from "@/src/models/Club"

type Props = { club: Club }

const schema = z.object({
    name: z.string().min(1),
    club_type: z.string().min(1),
    street: z.string().min(1),
    house_number: z.string(),
    location: z.string().min(1),
    postal_code: z.string().min(1),
    country: z.string().min(1),
    dates_visible_for_all_members: z.boolean(),
    members_can_send_messages: z.boolean(),
    feedback_visibility: z.enum(visibilityOptions),
    reason_visibility: z.enum(visibilityOptions),
})

export const ClubSettingsForm = ({ club }: Props) => {
    const { t } = useTranslation()
    const queryClient = useQueryClient()

    const form = useForm<z.infer<typeof schema>>({
        resolver: zodResolver(schema),
        defaultValues: {
            name: club.name,
            club_type: club.club_type,
            street: club.street,
            house_number: club.house_number,
            location: club.location,
            postal_code: club.postal_code,
            country: club.country,
            dates_visible_for_all_members: club.dates_visible_for_all_members,
            members_can_send_messages: club.members_can_send_messages,
            feedback_visibility: (visibilityOptions as readonly string[]).includes(club.feedback_visibility)
                ? (club.feedback_visibility as (typeof visibilityOptions)[number])
                : "leaders-and-authorized",
            reason_visibility: (visibilityOptions as readonly string[]).includes(club.reason_visibility)
                ? (club.reason_visibility as (typeof visibilityOptions)[number])
                : "leaders-and-authorized",
        },
    })

    const mutation = $api.useMutation("patch", "/v1/clubs/{clubId}", {
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["clubs"] })
        },
    })

    const onSubmit = (values: z.infer<typeof schema>) => {
        mutation.mutate({
            params: { path: { clubId: club.id } },
            body: { ...values, confirmed_representative: true },
        })
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t("club-name")}</FormLabel>
                            <FormControl>
                                <Input {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <FormField
                        control={form.control}
                        name="street"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t("street")}</FormLabel>
                                <FormControl>
                                    <Input {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="house_number"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nr.</FormLabel>
                                <FormControl>
                                    <Input {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="postal_code"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t("plz")}</FormLabel>
                                <FormControl>
                                    <Input {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t("city")}</FormLabel>
                                <FormControl>
                                    <Input {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="country"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t("country")}</FormLabel>
                                <FormControl>
                                    <Input {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="dates_visible_for_all_members"
                    render={({ field }) => (
                        <FormItem>
                            <div className="flex items-center gap-2">
                                <FormControl>
                                    <Checkbox
                                        checked={field.value}
                                        onCheckedChange={(checked) => field.onChange(checked === true)}
                                    />
                                </FormControl>
                                <FormLabel>{t("club-dates-visible-for-members")}</FormLabel>
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="members_can_send_messages"
                    render={({ field }) => (
                        <FormItem>
                            <div className="flex items-center gap-2">
                                <FormControl>
                                    <Checkbox
                                        checked={field.value}
                                        onCheckedChange={(checked) => field.onChange(checked === true)}
                                    />
                                </FormControl>
                                <FormLabel>{t("club-members-can-send-messages")}</FormLabel>
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="feedback_visibility"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t("club-feedback-visibility")}</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                                <FormControl>
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {visibilityOptions.map((option) => (
                                        <SelectItem key={option} value={option}>
                                            {t(`club-visibility-${option}`)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="reason_visibility"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t("club-reason-visibility")}</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                                <FormControl>
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {visibilityOptions.map((option) => (
                                        <SelectItem key={option} value={option}>
                                            {t(`club-visibility-${option}`)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Button type="submit" disabled={mutation.isPending}>
                    {t("save")}
                </Button>
                {mutation.isSuccess && (
                    <p className="text-sm text-green-600">{t("saved")}</p>
                )}
            </form>
        </Form>
    )
}
