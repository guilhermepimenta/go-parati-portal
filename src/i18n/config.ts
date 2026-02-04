import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import pt from './locales/pt.json';
import en from './locales/en.json';
import es from './locales/es.json';

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        fallbackLng: 'pt',
        debug: false,
        interpolation: {
            escapeValue: false, // not needed for react as it escapes by default
        },
        resources: {
            pt: { translation: pt },
            en: { translation: en },
            es: { translation: es }
        },
        detection: {
            order: ['querystring', 'cookie', 'localStorage', 'navigator'],
            caches: ['localStorage', 'cookie']
        }
    });

export default i18n;
