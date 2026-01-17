
import React from 'react';
import {
    Compass, ShieldCheck, Mail, MapPin, Phone, Award, Globe,
    LayoutDashboard, Instagram, Facebook, Youtube
} from 'lucide-react';
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
    return (
        <footer className="bg-slate-950 text-slate-400 py-20 mt-20 border-t border-slate-900">
            <div className="max-w-7xl mx-auto px-4 md:px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
                    <div className="space-y-8">
                        <div className="brightness-0 invert opacity-90">
                            <Logo />
                        </div>
                        <p className="text-sm leading-relaxed text-slate-400 max-w-xs">
                            Sua porta de entrada inteligente para o paraíso. Unimos tecnologia e tradição para oferecer a melhor experiência em Paraty, RJ.
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
                        <h5 className="text-white font-extrabold text-sm uppercase tracking-widest mb-8 flex items-center gap-2">
                            <Compass className="w-4 h-4 text-sky-500" />
                            Explorar
                        </h5>
                        <ul className="space-y-4 text-sm font-medium">
                            <li><button onClick={() => onNavigate('history')} className="hover:text-white transition-colors">Patrimônio Histórico</button></li>
                            <li><button onClick={() => onNavigate('adventure')} className="hover:text-white transition-colors">Trilhas e Cachoeiras</button></li>
                            <li><button onClick={() => onNavigate('totems')} className="text-sky-400 hover:text-sky-300 transition-colors">Totens Paraty Rotativo</button></li>
                            <li className="pt-4">
                                <FooterMap onOpenMap={onOpenMap} />
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h5 className="text-white font-extrabold text-sm uppercase tracking-widest mb-8 flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-500" />
                            Suporte & Admin
                        </h5>
                        <ul className="space-y-4 text-sm font-medium">
                            <li>
                                <button
                                    onClick={() => currentUser ? onNavigate('dashboard') : onLogin()}
                                    className="flex items-center gap-2 text-sky-400 hover:text-sky-300 transition-colors font-bold"
                                >
                                    <LayoutDashboard className="w-4 h-4" />
                                    {currentUser ? 'Painel de Controle' : 'Área do Parceiro'}
                                </button>
                            </li>
                            <li><button onClick={() => onNavigate('advertise')} className="hover:text-white transition-colors">Como anunciar?</button></li>
                            <li><button onClick={() => onNavigate('help')} className="hover:text-white transition-colors">Central de Ajuda</button></li>
                            <li><button onClick={() => onNavigate('terms')} className="hover:text-white transition-colors">Termos de Uso</button></li>
                            <li><button onClick={() => onNavigate('privacy')} className="hover:text-white transition-colors">Privacidade</button></li>
                        </ul>
                    </div>

                    <div>
                        <h5 className="text-white font-extrabold text-sm uppercase tracking-widest mb-8 flex items-center gap-2">
                            <Mail className="w-4 h-4 text-amber-500" />
                            Contato
                        </h5>
                        <div className="space-y-6 text-sm">
                            <div className="flex items-start gap-4">
                                <div className="p-2 bg-white/5 rounded-lg">
                                    <MapPin className="w-4 h-4 text-slate-400" />
                                </div>
                                <p className="leading-tight">Av. Roberto Silveira, s/n<br />Centro, Paraty - RJ</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-white/5 rounded-lg">
                                    <Phone className="w-4 h-4 text-slate-400" />
                                </div>
                                <p>+55 (24) 3371-1234</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-white/5 rounded-lg">
                                    <Mail className="w-4 h-4 text-slate-400" />
                                </div>
                                <p>contato@goparaty.com.br</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex flex-wrap justify-center gap-8">
                        <div className="flex items-center gap-2 opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all cursor-default">
                            <Award className="w-5 h-5" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Selo Turismo Responsável</span>
                        </div>
                        <div className="flex items-center gap-2 opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all cursor-default">
                            <Globe className="w-5 h-5" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">UNESCO World Heritage Site</span>
                        </div>
                    </div>

                    <div className="text-[10px] uppercase font-bold tracking-widest text-slate-600 flex items-center gap-4">
                        <span>&copy; 2024 Go Paraty Inc.</span>
                        <span className="w-1 h-1 bg-slate-800 rounded-full" />
                        <span>Desenvolvido com ❤️ para Paraty</span>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
