import { FC, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import axios from "axios";
import { apiURL } from "@/src/Keycloak";
import { Club } from "@/src/models/Club";

type ClubProps = {

}

export const ClubView: FC<ClubProps> = ({})=>{
    const { t } = useTranslation()
    const queryClient = useQueryClient()
    const [currentStep, setCurrentStep] = useState(0)
    const [createdClub, setCreatedClub] = useState<Club | null>(null)
    const [inviteInput, setInviteInput] = useState("")
    const fieldRequiredMessage = String(t("fieldRequired"))

    const clubTypes = [
        "musikverein",
        "chor",
        "orchester",
        "ensemble",
        "band",
        "posaunenchor",
    ] as const

    const visibilityOptions = [
        "leaders-and-authorized",
        "all-members",
        "only-authorized",
    ] as const

    const formSchema = z.object({
        name: z.string().min(1, fieldRequiredMessage),
        club_type: z.enum(clubTypes),
        street: z.string().min(1, fieldRequiredMessage),
        house_number: z.string(),
        location: z.string().min(1, fieldRequiredMessage),
        postal_code: z.string().min(1, fieldRequiredMessage),
        country: z.string().min(1, fieldRequiredMessage),
        dates_visible_for_all_members: z.boolean(),
        members_can_send_messages: z.boolean(),
        feedback_visibility: z.enum(visibilityOptions),
        reason_visibility: z.enum(visibilityOptions),
        confirmed_representative: z.boolean().refine((value) => value, fieldRequiredMessage),
    })

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            club_type: "musikverein",
            street: "",
            house_number: "",
            location: "",
            postal_code: "",
            country: "",
            dates_visible_for_all_members: false,
            members_can_send_messages: false,
            feedback_visibility: "leaders-and-authorized",
            reason_visibility: "leaders-and-authorized",
            confirmed_representative: false,
        },
    })

    const mutation = useMutation<Club, unknown, z.infer<typeof formSchema>>(
        {
            mutationFn: async (variables)=>{
                const response = await axios.post<Club>(apiURL + "/v1/clubs/", variables)
                return response.data
            },
            onSuccess: (club)=>{
                setCreatedClub(club)
                queryClient.invalidateQueries({ queryKey: ["clubs"] })
            }
        }
    )

    const onSubmit = (values: z.infer<typeof formSchema>)=>{
        mutation.mutate(values)
    }

    const inviteMutation = useMutation<{
        added_emails: string[];
        invited_emails: string[];
        failed_emails: string[];
    }, unknown, string[]>(
        {
            mutationFn: async (emails) => {
                if (!createdClub) {
                    throw new Error("No club")
                }
                const response = await axios.post<{
                    added_emails: string[];
                    invited_emails: string[];
                    failed_emails: string[];
                }>(`${apiURL}/v1/clubs/${createdClub.id}/members/invite`, {
                    emails,
                })
                return response.data
            },
            onSuccess: () => {
                setInviteInput("")
            }
        }
    )

    const steps: Array<Array<keyof z.infer<typeof formSchema>>> = [
        ["name", "club_type"],
        ["country", "postal_code", "location", "street"],
        [
            "dates_visible_for_all_members",
            "members_can_send_messages",
            "feedback_visibility",
            "reason_visibility",
            "confirmed_representative",
        ],
    ]

    const onNext = async () => {
        const valid = await form.trigger(steps[currentStep])
        if (!valid) {
            return
        }
        setCurrentStep((value) => Math.min(value + 1, steps.length - 1))
    }

    const onPrevious = () => {
        setCurrentStep((value) => Math.max(value - 1, 0))
    }

    const onInvite = () => {
        const emails = inviteInput
            .split(/[\n,;]+/)
            .map((value) => value.trim().toLowerCase())
            .filter((value) => value.length > 0)
        if (emails.length === 0) {
            return
        }
        inviteMutation.mutate(emails)
    }

    return <div className="md:ml-8 mt-4 md:mr-4">
        <h2 className="text-2xl font-bold">{t('create-club')}</h2>
        {createdClub && (
            <div className="mt-4 max-w-2xl space-y-4 rounded border bg-card p-4">
                <h3 className="text-xl font-semibold">{t("club-create-success-title")}</h3>
                <p className="text-sm text-muted-foreground">
                    {t("club-create-success-description", { name: createdClub.name })}
                </p>
                <div className="space-y-2">
                    <Label htmlFor="club-invite-input">{t("club-invite-label")}</Label>
                    <Input
                        id="club-invite-input"
                        placeholder={String(t("club-invite-placeholder"))}
                        value={inviteInput}
                        onChange={(event) => setInviteInput(event.target.value)}
                    />
                    <Button type="button" onClick={onInvite} disabled={inviteMutation.isPending}>
                        {t("club-invite-submit")}
                    </Button>
                    {inviteMutation.isError && (
                        <p className="text-sm text-destructive">{t("club-invite-error")}</p>
                    )}
                    {inviteMutation.data && (
                        <div className="text-sm">
                            <p>{t("club-invite-added", { count: inviteMutation.data.added_emails.length })}</p>
                            <p>{t("club-invite-sent", { count: inviteMutation.data.invited_emails.length })}</p>
                            {inviteMutation.data.failed_emails.length > 0 && (
                                <p>{t("club-invite-failed", { emails: inviteMutation.data.failed_emails.join(", ") })}</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        )}
        {!createdClub && (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-6">
                <div className="flex gap-2">
                    {steps.map((_, index) => (
                        <button
                            key={index}
                            type="button"
                            className={`h-2 flex-1 rounded ${index <= currentStep ? "bg-teal-700" : "bg-muted"}`}
                            onClick={() => setCurrentStep(index)}
                        />
                    ))}
                </div>

                {currentStep === 0 && (
                    <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("club-name")}</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Musikverein Beispielstadt" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="club_type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("club-type")}</FormLabel>
                                    <FormControl>
                                        <RadioGroup value={field.value} onValueChange={field.onChange} className="grid gap-2">
                                            {clubTypes.map((clubType) => (
                                                <div key={clubType} className="flex items-center gap-2">
                                                    <RadioGroupItem id={clubType} value={clubType} />
                                                    <Label htmlFor={clubType}>{t(`club-type-${clubType}`)}</Label>
                                                </div>
                                            ))}
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                )}

                {currentStep === 1 && (
                    <div className="grid gap-4 md:grid-cols-2">
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
                    </div>
                )}

                {currentStep === 2 && (
                    <div className="grid gap-4">
                        <FormField
                            control={form.control}
                            name="dates_visible_for_all_members"
                            render={({ field }) => (
                                <FormItem>
                                    <div className="flex items-center gap-2">
                                        <FormControl>
                                            <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />
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
                                            <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />
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
                        <FormField
                            control={form.control}
                            name="confirmed_representative"
                            render={({ field }) => (
                                <FormItem>
                                    <div className="flex items-center gap-2">
                                        <FormControl>
                                            <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />
                                        </FormControl>
                                        <FormLabel>{t("club-representative-confirmation")}</FormLabel>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                )}

                <div className="flex justify-end gap-3">
                    {mutation.isError && (
                        <p className="self-center text-sm text-destructive">{t("club-create-error")}</p>
                    )}
                    {currentStep > 0 && (
                        <Button type="button" variant="secondary" onClick={onPrevious}>
                            {t("cancel")}
                        </Button>
                    )}
                    {currentStep < steps.length - 1 && (
                        <Button type="button" onClick={onNext}>
                            {t("continue")}
                        </Button>
                    )}
                    {currentStep === steps.length - 1 && (
                        <Button type="submit" disabled={mutation.isPending}>
                            {t("create-club")}
                        </Button>
                    )}
                </div>
            </form>
        </Form>
        )}
    </div>
}
