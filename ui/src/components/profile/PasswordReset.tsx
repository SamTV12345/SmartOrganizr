import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {t} from "i18next";

export const PasswordReset = ()=>{
    return <Card className="bg-gray-700 text-white">
        <CardHeader className="border-b-2 border-gray-600 bg-accentDark">
            <CardTitle>Passwort ändern</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="leading-7 [&:not(:first-child)]:mt-6  text-muted-foreground ui">
                Das Passwort kann aus Sicherheitsgründen nicht in SmartOrganizr geändert werden.
                Bitte ändern Sie Ihr Passwort über den folgenden Link.
                <Button variant="default" className="float-right mt-5 bg-accentDark hover:bg-accentDarkHover cursor-pointer">{t('reset-password')}</Button>
            </p>
        </CardContent>
    </Card>
}