import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {t} from "i18next";

export const PasswordReset = ()=>{
    return <Card>
        <CardHeader className="bg-muted/40 border-b">
            <CardTitle>Passwort ändern</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground leading-7 [&:not(:first-child)]:mt-6">
                Das Passwort kann aus Sicherheitsgründen nicht in SmartOrganizr geändert werden.
                Bitte ändern Sie Ihr Passwort über den folgenden Link.
            </p>
            <Button variant="default" className="mt-5 w-full md:ml-auto md:w-auto">{t('reset-password')}</Button>
        </CardContent>
    </Card>
}
