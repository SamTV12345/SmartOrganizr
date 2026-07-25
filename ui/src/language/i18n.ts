import i18n from 'i18next'
import {initReactI18next} from "react-i18next";
import LanguageDetector from 'i18next-browser-languagedetector'
import de_translation from './json/de.json'
import en_translation from './json/en.json'


const resources = {
    de: {
       translation:de_translation
    },
    en:{
        translation: en_translation
    }
}

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init(
        {
            resources,
            // Without a fallback i18next falls back to its "dev" language and
            // renders raw keys for any browser locale we don't ship.
            fallbackLng: "en",
            supportedLngs: ["de", "en"],
            // Maps regional variants (de-AT, en-GB) onto the base language.
            nonExplicitSupportedLngs: true,
        }
    )

export default i18n