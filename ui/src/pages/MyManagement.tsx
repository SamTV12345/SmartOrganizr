import {NavigationButton} from "../components/NavigationButton";
import {useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";

export const MyManagement = ()=>{
    const navigate = useNavigate()
    const {t} = useTranslation()

    return <div className="flex  items-center h-80">
        <div className="w-full">
            <h2 className="text-2xl text-center">Mein Notenmanagement</h2>
            <div className="p-10 grid grid-cols-3 gap-5">
                <NavigationButton className="" onClick={() => {
                   navigate("/noteManagement/authors")
                }}>
                    <i className="fa-solid fa-user-tie fa-xl"></i>
                    <div >
                        {t('authors')}
                    </div>
                </NavigationButton>
                <NavigationButton className="" onClick={() => {
                    navigate("/noteManagement/concerts")
                }}>

                    <i className="fa-solid fa-user-tie fa-xl"></i>
                    <div >
                        {t('concerts')}
                    </div>
                </NavigationButton>
                <NavigationButton className="" onClick={() => {
                    navigate("/noteManagement/folders")
                }}>
                    <i className="fa-solid fa-folder-open fa-xl"></i>
                    <div>
                    {t('folders')}
                    </div>
                </NavigationButton>
                <NavigationButton className="" onClick={() => {
                    navigate("/noteManagement/io")
                }}>
                    <i className="fa-solid fa-file-export fa-xl"></i>
                    <div>
                        {t('io')}
                    </div>
                </NavigationButton>
                <NavigationButton className="" onClick={() => {
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
