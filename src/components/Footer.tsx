
import React from 'react';
import {
    Compass, ShieldCheck, Mail, MapPin, Phone, Award, Globe,
    LayoutDashboard, Instagram, Facebook, Youtube
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Logo from './Logo';
import FooterMap from './FooterMap';
import WeatherTideWidget from './WeatherTideWidget';
import { User } from '../types';


interface FooterProps {
    onNavigate: (view: string) => void;
    currentUser: User | null;
    onLogin: () => void;
    onOpenMap: () => void;
}

const Footer: React.FC<FooterProps> = ({ onNavigate, currentUser, onLogin, onOpenMap }) => {
    const { t } = useTranslation();

    // Secret Login: Single click on copyright to open
    const handleSecretClick = () => {
        onLogin();
    };

    return (
        <footer className="bg-ink text-white py-20 mt-20 border-t border-black/10 relative overflow-hidden">
            {/* Texture Overlay */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none"></div>

            <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
                    <div className="space-y-8">
                        <div className="brightness-0 invert opacity-90">
                            <Logo />
                        </div>
                        <p className="text-sm leading-relaxed text-white/80 max-w-xs font-sans">
                            {t('footer.description')}
                        </p>
                        <div className="flex gap-4">
                            <button className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors group">
                                <Instagram className="w-5 h-5 group-hover:text-pink-500" />
                            </button>
                            <button className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors group">
                                <Facebook className="w-5 h-5 group-hover:text-blue-500" />
                            </button>
                            <button className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors group">
                                <Youtube className="w-5 h-5 group-hover:text-red-500" />
                            </button>
                        </div>

                        <WeatherTideWidget variant="footer" />
                    </div>

                    <div>
                        <h5 className="text-coral font-serif font-bold text-lg mb-8 flex items-center gap-2 italic">
                            <Compass className="w-5 h-5" />
                            {t('footer.explore')}
                        </h5>
                        <ul className="space-y-4 text-sm font-medium font-sans">
                            <li><button onClick={() => onNavigate('history')} className="hover:text-coral transition-colors">{t('categories.historia')}</button></li>
                            <li><button onClick={() => onNavigate('adventure')} className="hover:text-coral transition-colors">{t('categories.aventura')}</button></li>
                            <li><button onClick={() => onNavigate('totems')} className="text-ocean hover:text-ocean/80 transition-colors font-bold">{t('footer.totems')}</button></li>
                            <li className="pt-4">
                                <FooterMap onOpenMap={onOpenMap} />
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h5 className="text-colonial-gold font-serif font-bold text-lg mb-8 flex items-center gap-2 italic">
                            <ShieldCheck className="w-5 h-5" />
                            {t('footer.support_admin')}
                        </h5>
                        <ul className="space-y-4 text-sm font-medium font-sans">
                            {currentUser && (
                                <li>
                                    <button
                                        onClick={() => onNavigate('dashboard')}
                                        className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition-colors font-bold"
                                    >
                                        <LayoutDashboard className="w-4 h-4" />
                                        {t('footer.admin_panel')}
                                    </button>
                                </li>
                            )}
                            <li><button onClick={() => onNavigate('advertise')} className="hover:text-colonial-gold transition-colors">{t('footer.advertise')}</button></li>
                            <li><button onClick={() => onNavigate('help')} className="hover:text-colonial-gold transition-colors">{t('footer.help_center')}</button></li>
                            <li><button onClick={() => onNavigate('terms')} className="hover:text-colonial-gold transition-colors">{t('footer.terms')}</button></li>
                            <li><button onClick={() => onNavigate('privacy')} className="hover:text-colonial-gold transition-colors">{t('footer.privacy')}</button></li>
                        </ul>
                    </div>

                    <div>
                        <h5 className="text-colonial-gold font-serif font-bold text-lg mb-8 flex items-center gap-2 italic">
                            <Mail className="w-5 h-5" />
                            {t('footer.contact')}
                        </h5>
                        <div className="space-y-6 text-sm font-sans">
                            <div className="flex items-start gap-4">
                                <div className="p-2 bg-white/5 rounded-lg">
                                    <MapPin className="w-4 h-4 text-surface-sand/60" />
                                </div>
                                <p className="leading-tight text-surface-sand/80">Av. Roberto Silveira, s/n<br />Centro, Paraty - RJ</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-white/5 rounded-lg">
                                    <Phone className="w-4 h-4 text-surface-sand/60" />
                                </div>
                                <p className="text-surface-sand/80">+55 (24) 3371-1234</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-white/5 rounded-lg">
                                    <Mail className="w-4 h-4 text-surface-sand/60" />
                                </div>
                                <p className="text-surface-sand/80">contato@goparaty.com.br</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex flex-wrap justify-center gap-8">
                        <div className="flex items-center gap-2 opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all cursor-default">
                            <Award className="w-5 h-5" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">{t('footer.responsible_tourism')}</span>
                        </div>
                        <div className="flex items-center gap-2 opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all cursor-default">
                            <Globe className="w-5 h-5" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">UNESCO World Heritage Site</span>
                        </div>
                    </div>

                    <div className="text-[10px] uppercase font-bold tracking-widest text-slate-600 flex items-center gap-4">
                        <span
                            onClick={handleSecretClick}
                            className="hover:text-slate-500 cursor-default select-none transition-colors"
                            title="v1.0.25 Basic"
                        >
                            &copy; 2024 Go Paraty Inc.
                        </span>
                        <span className="w-1 h-1 bg-slate-800 rounded-full" />
                        <span>{t('footer.made_with_love')}</span>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
