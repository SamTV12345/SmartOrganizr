import {NavigationButton} from "../components/NavigationButton";
import {useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";

export const MyManagement = ()=>{
    const navigate = useNavigate()
    const {t} = useTranslation()

    return <div className="flex  items-center">
        <div className="w-full">
            <h2 className="text-2xl text-center md:mt-32">Mein Notenmanagement</h2>
            <div className="p-10 grid md:grid-cols-3 grid-cols-2 gap-5">
                <NavigationButton className="h-64" onClick={() => {
                   navigate("/noteManagement/authors")
                }}>
                    <i className="fa-solid fa-user-tie fa-xl"></i>
                    <div >
                        {t('authors')}
                    </div>
                </NavigationButton>
                <NavigationButton className="h-64" onClick={() => {
                    navigate("/noteManagement/concerts")
                }}>

                    <i className="fa-solid fa-user-tie fa-xl"></i>
                    <div >
                        {t('concerts')}
                    </div>
                </NavigationButton>
                <NavigationButton className="h-64" onClick={() => {
                    navigate("/noteManagement/folders")
                }}>
                    <i className="fa-solid fa-folder-open fa-xl"></i>
                    <div>
                    {t('folders')}
                    </div>
                </NavigationButton>
                <NavigationButton className="h-64" onClick={() => {
                    navigate("/noteManagement/io")
                }}>
                    <i className="fa-solid fa-file-export fa-xl"></i>
                    <div>
                        {t('io')}
                    </div>
                </NavigationButton>
                <NavigationButton className="h-64" onClick={() => {
                    navigate("/noteManagement/notes")
                }}>
                    <i className="fa-solid fa-magnifying-glass fa-xl"></i>
                    <div >
                        {t('search')}
                    </div>

                </NavigationButton>

            </div>

        </div>
    </div>
}
