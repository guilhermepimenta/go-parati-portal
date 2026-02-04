import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher: React.FC<{ className?: string }> = ({ className = '' }) => {
    const { i18n } = useTranslation();

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
    };

    const languages = [
        { code: 'pt', flag: 'https://flagcdn.com/w40/br.png', label: 'Português' },
        { code: 'en', flag: 'https://flagcdn.com/w40/us.png', label: 'English' },
        { code: 'es', flag: 'https://flagcdn.com/w40/es.png', label: 'Español' }
    ];

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            {languages.map((lang) => (
                <button
                    key={lang.code}
                    onClick={() => changeLanguage(lang.code)}
                    className={`relative flex items-center justify-center w-8 h-8 rounded-full transition-all overflow-hidden ${i18n.language === lang.code
                        ? 'ring-2 ring-emerald-500 ring-offset-2 scale-110 grayscale-0'
                        : 'grayscale opacity-70 hover:grayscale-0 hover:opacity-100 hover:scale-110'
                        }`}
                    title={lang.label}
                >
                    <img
                        src={lang.flag}
                        alt={lang.label}
                        className="w-full h-full object-cover"
                    />
                </button>
            ))}
        </div>
    );
};

export default LanguageSwitcher;
