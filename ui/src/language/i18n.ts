import i18n from 'i18next'
import {initReactI18next} from "react-i18next";
import LanguageDetector from 'i18next-browser-languagedetector'

const resources = {
    de: {
       translation:{
           homepage: "Startseite",
           fast: 'Schnell',
           modern: 'Modern',
           selfHosted: 'Selbst gehostet',
           authors: 'Komponisten',
           id: 'ID',
           name: 'Name',
           extraInformation: 'Weitere Informationen',
           folderView: 'Ordneransicht'
       }
    },
    en:{
        translation: {
            homepage: "Homepage",
            fast: 'Fast',
            modern: 'Modern',
            selfHosted: 'Self hosted',
            authors: 'Authors',
            id: 'Id',
            name: 'Name',
            extraInformation: 'Further information',
            folderView: 'Folder view'
        }
    }
}

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init(
        {
            resources
        }
    )

export default i18n