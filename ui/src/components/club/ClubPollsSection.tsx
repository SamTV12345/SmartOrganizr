import { FC, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { http as axios } from "@/src/api/client";
import { apiURL } from "@/src/Keycloak";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Vote, X } from "lucide-react";

type PollOption = {
    id: string;
    label: string;
    voteCount: number;
    votedByMe: boolean;
};

type Poll = {
    id: string;
    question: string;
    multipleChoice: boolean;
    closed: boolean;
    totalVotes: number;
    options: PollOption[];
};

type Props = {
    clubId: string;
    canManage: boolean;
};

export const ClubPollsSection: FC<Props> = ({ clubId, canManage }) => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();

    const [question, setQuestion] = useState("");
    const [options, setOptions] = useState<string[]>(["", ""]);
    const [multiple, setMultiple] = useState(false);
    // Per-poll selected option ids for the ballot.
    const [selection, setSelection] = useState<Record<string, string[]>>({});

    const { data } = useQuery({
        queryKey: ["club-polls", clubId],
        queryFn: async () => (await axios.get<Poll[]>(`${apiURL}/v1/clubs/${clubId}/polls`)).data,
    });
    const polls = data ?? [];

    const invalidate = async () => {
        await queryClient.invalidateQueries({ queryKey: ["club-polls", clubId] });
    };

    const createMutation = useMutation({
        mutationFn: async () =>
            axios.post(`${apiURL}/v1/clubs/${clubId}/polls`, {
                question: question.trim(),
                options: options.map((o) => o.trim()).filter(Boolean),
                multipleChoice: multiple,
            }),
        onSuccess: async () => {
            setQuestion("");
            setOptions(["", ""]);
            setMultiple(false);
            await invalidate();
        },
    });

    const voteMutation = useMutation({
        mutationFn: async (vars: { pollId: string; optionIds: string[] }) =>
            axios.post(`${apiURL}/v1/clubs/${clubId}/polls/${vars.pollId}/vote`, { optionIds: vars.optionIds }),
        onSuccess: async () => {
            await invalidate();
        },
    });

    const closeMutation = useMutation({
        mutationFn: async (pollId: string) => axios.post(`${apiURL}/v1/clubs/${clubId}/polls/${pollId}/close`),
        onSuccess: async () => {
            await invalidate();
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (pollId: string) => axios.delete(`${apiURL}/v1/clubs/${clubId}/polls/${pollId}`),
        onSuccess: async () => {
            await invalidate();
        },
    });

    const validOptions = options.map((o) => o.trim()).filter(Boolean);
    const canCreate = question.trim().length > 0 && validOptions.length >= 2;

    const toggleSelection = (poll: Poll, optionId: string) => {
        setSelection((prev) => {
            const current = prev[poll.id] ?? [];
            if (poll.multipleChoice) {
                return {
                    ...prev,
                    [poll.id]: current.includes(optionId)
                        ? current.filter((id) => id !== optionId)
                        : [...current, optionId],
                };
            }
            return { ...prev, [poll.id]: [optionId] };
        });
    };

    return (
        <div className="space-y-4">
            {canManage && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Vote className="size-5 text-accentDark" />
                            {t("polls.create")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="grid gap-2">
                            <Label htmlFor="poll-question">{t("polls.question")}</Label>
                            <Input
                                id="poll-question"
                                value={question}
                                placeholder={t("polls.questionPlaceholder") as string}
                                onChange={(e) => setQuestion(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            {options.map((opt, i) => (
                                <div key={i} className="flex gap-2">
                                    <Input
                                        aria-label={`${t("polls.option")} ${i + 1}`}
                                        value={opt}
                                        onChange={(e) =>
                                            setOptions((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))
                                        }
                                    />
                                    {options.length > 2 && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            aria-label="remove-option"
                                            onClick={() => setOptions((prev) => prev.filter((_, idx) => idx !== i))}
                                        >
                                            <X className="size-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                            <Button variant="outline" size="sm" onClick={() => setOptions((prev) => [...prev, ""])}>
                                <Plus className="size-4" />
                                {t("polls.addOption")}
                            </Button>
                        </div>
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="poll-multiple"
                                checked={multiple}
                                onCheckedChange={(v) => setMultiple(v === true)}
                            />
                            <Label htmlFor="poll-multiple">{t("polls.multiple")}</Label>
                        </div>
                        <Button onClick={() => createMutation.mutate()} disabled={!canCreate || createMutation.isPending}>
                            {t("polls.create")}
                        </Button>
                        {!canCreate && question.trim().length > 0 && (
                            <p className="text-sm text-muted-foreground">{t("polls.needTwoOptions")}</p>
                        )}
                    </CardContent>
                </Card>
            )}

            {polls.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("polls.empty")}</p>
            ) : (
                <div className="space-y-3">
                    {polls.map((poll) => {
                        const selected = selection[poll.id] ?? [];
                        return (
                            <Card key={poll.id}>
                                <CardHeader>
                                    <div className="flex items-start justify-between gap-2">
                                        <CardTitle className="flex items-center gap-2">
                                            {poll.question}
                                            {poll.closed && (
                                                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                                    {t("polls.closed")}
                                                </span>
                                            )}
                                        </CardTitle>
                                        {canManage && (
                                            <div className="flex gap-1">
                                                {!poll.closed && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => closeMutation.mutate(poll.id)}
                                                    >
                                                        {t("polls.close")}
                                                    </Button>
                                                )}
                                                <AlertDialog>
                                                    <AlertDialogTrigger
                                                        render={<Button variant="ghost" size="sm" aria-label={t("polls.delete")} />}
                                                    >
                                                        <Trash2 className="size-4 text-red-500" />
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>{t("polls.delete")}</AlertDialogTitle>
                                                            <AlertDialogDescription>{t("polls.delete-confirm")}</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => deleteMutation.mutate(poll.id)}>
                                                                {t("polls.delete")}
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {poll.options.map((option) => {
                                        const pct = poll.totalVotes > 0 ? Math.round((option.voteCount / poll.totalVotes) * 100) : 0;
                                        return (
                                            <div key={option.id} className="space-y-1">
                                                <label className="flex items-center gap-2 text-sm">
                                                    <input
                                                        type={poll.multipleChoice ? "checkbox" : "radio"}
                                                        name={`poll-${poll.id}`}
                                                        disabled={poll.closed}
                                                        checked={selected.includes(option.id)}
                                                        onChange={() => toggleSelection(poll, option.id)}
                                                    />
                                                    <span className={option.votedByMe ? "font-semibold text-accentDark" : ""}>
                                                        {option.label}
                                                    </span>
                                                    <span className="ml-auto text-xs text-muted-foreground">
                                                        {t("polls.votes", { count: option.voteCount })} · {pct}%
                                                    </span>
                                                </label>
                                                <div className="h-2 w-full overflow-hidden rounded bg-muted">
                                                    <div
                                                        className="h-full rounded bg-accentDark transition-all"
                                                        style={{ width: `${pct}%` }}
                                                        data-testid={`bar-${option.id}`}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {!poll.closed && (
                                        <Button
                                            size="sm"
                                            disabled={selected.length === 0 || voteMutation.isPending}
                                            onClick={() => voteMutation.mutate({ pollId: poll.id, optionIds: selected })}
                                        >
                                            {t("polls.vote")}
                                        </Button>
                                    )}
                                    <p className="text-xs text-muted-foreground">
                                        {t("polls.totalVotes", { count: poll.totalVotes })}
                                    </p>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
