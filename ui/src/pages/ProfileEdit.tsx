import {useQueryClient} from "@tanstack/react-query";
import {useKeycloak} from "@/src/Keycloak/useKeycloak";
import {useTranslation} from "react-i18next";
import {ProfileUploadEdit} from "@/src/components/profile/ProfileUploadEdit";
import {ProfileGeneralEdit} from "@/src/components/profile/ProfileGeneralEdit";
import {GeburtstagAdresseEdit} from "@/src/components/profile/GeburtstagAdresseEdit";
import {PasswordReset} from "@/src/components/profile/PasswordReset";

export const ProfileEdit = ()=> {

    return (
        <div className="flex flex-col items-center h-screen">
            <div className="mx-auto w-2/3 mt-10">
                <h1 className="text-2xl mb-4">Profil</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-4">
                    <ProfileUploadEdit/>
                    <ProfileGeneralEdit/>
                    <GeburtstagAdresseEdit/>
                    <PasswordReset/>
                </div>
                </div>
            </div>
        </div>
    );
}
