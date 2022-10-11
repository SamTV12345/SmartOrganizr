import i18n from 'i18next'
import {initReactI18next} from "react-i18next";
import LanguageDetector from 'i18next-browser-languagedetector'

const resources = {
    de: {
       translation:{
           homepage:"Startseite"
       }
    },
    en:{
        translation:{
            homepage: "Homepage"
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