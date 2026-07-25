import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {t} from "i18next";

export const PasswordReset = ()=>{
    return <Card>
        <CardHeader className="bg-muted/40 border-b">
            <CardTitle>{t("profilePage.changePassword")}</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground leading-7 [&:not(:first-child)]:mt-6">
                {t("profilePage.passwordHint")}
            </p>
            <Button variant="default" className="mt-5 w-full md:ml-auto md:w-auto">{t('reset-password')}</Button>
        </CardContent>
    </Card>
}
