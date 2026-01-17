
import React, { useState } from 'react';
import { Mail, Phone, Send, CheckCircle, ArrowRight, Star, TrendingUp, Users } from 'lucide-react';
import { supabase } from '../supabase';

export const Advertise: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        businessName: '',
        email: '',
        phone: '',
        message: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase
                .from('leads')
                .insert([
                    {
                        name: formData.name,
                        business_name: formData.businessName,
                        email: formData.email,
                        phone: formData.phone,
                        message: formData.message
                    }
                ]);

            if (error) throw error;

            setSubmitted(true);
        } catch (error) {
            console.error('Error submitting lead:', error);
            alert('Erro ao enviar solicitação. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-300">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle className="w-10 h-10 text-emerald-600" />
                </div>
                <h2 className="text-3xl font-extrabold text-slate-900 mb-4">Mensagem Enviada!</h2>
                <p className="text-slate-500 max-w-md mx-auto mb-8 text-lg">
                    Obrigado pelo interesse em anunciar no Go Paraty. Nossa equipe comercial entrará em contato em até 24 horas úteis.
                </p>
                <button
                    onClick={onBack}
                    className="px-8 py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all shadow-xl"
                >
                    Voltar para Home
                </button>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
            {/* Hero Header */}
            <div className="bg-slate-900 rounded-[32px] p-8 md:p-16 text-center text-white mb-12 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80')] opacity-10 bg-cover bg-center" />
                <div className="relative z-10 max-w-3xl mx-auto">
                    <span className="inline-block py-1 px-3 rounded-full bg-sky-500/20 text-sky-400 text-xs font-bold uppercase tracking-widest mb-6 border border-sky-500/30">
                        Parceria Comercial
                    </span>
                    <h1 className="text-4xl md:text-5xl font-black mb-6 tracking-tight leading-tight">
                        Destaque seu negócio para milhares de turistas
                    </h1>
                    <p className="text-lg text-slate-300 mb-8 max-w-2xl mx-auto leading-relaxed">
                        O Go Paraty é o guia oficial digital mais acessado da região. Conecte sua marca a quem busca o que há de melhor na cidade.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
                {/* Benefits Column */}
                <div className="space-y-8">
                    <h3 className="text-2xl font-bold text-slate-800 mb-6">Por que anunciar conosco?</h3>

                    <div className="flex gap-4 p-6 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                        <div className="p-3 bg-sky-50 rounded-xl h-fit">
                            <Users className="w-6 h-6 text-sky-600" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900 mb-1">Alcance Qualificado</h4>
                            <p className="text-slate-500 text-sm">Turistas que já estão na cidade buscando onde comer, dormir e se divertir.</p>
                        </div>
                    </div>

                    <div className="flex gap-4 p-6 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                        <div className="p-3 bg-amber-50 rounded-xl h-fit">
                            <Star className="w-6 h-6 text-amber-600" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900 mb-1">Destaque Premium</h4>
                            <p className="text-slate-500 text-sm">Sua marca em evidência na Home e no topo das categorias.</p>
                        </div>
                    </div>

                    <div className="flex gap-4 p-6 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                        <div className="p-3 bg-emerald-50 rounded-xl h-fit">
                            <TrendingUp className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900 mb-1">Relatórios de Performance</h4>
                            <p className="text-slate-500 text-sm">Acompanhe cliques, visualizações e engajamento do seu anúncio.</p>
                        </div>
                    </div>

                    <div className="mt-8 p-6 bg-slate-50 rounded-2xl border border-slate-200">
                        <h5 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                            <Phone className="w-4 h-4" /> Dúvidas?
                        </h5>
                        <p className="text-slate-500 text-sm mb-4">Fale direto com nosso comercial:</p>
                        <a href="https://wa.me/552499999999" target="_blank" rel="noreferrer" className="text-sky-600 font-bold hover:underline">
                            (24) 99999-9999
                        </a>
                    </div>
                </div>

                {/* Form Column */}
                <div className="bg-white p-8 rounded-[32px] shadow-xl border border-slate-100">
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">Solicitar Proposta</h3>
                    <p className="text-slate-500 mb-8">Preencha os dados abaixo e entraremos em contato.</p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Nome do Responsável</label>
                            <input
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                type="text"
                                className="w-full bg-slate-50 border-2 border-slate-200 focus:border-sky-500 focus:bg-white rounded-xl py-3 px-4 outline-none transition-all font-medium text-slate-700"
                                placeholder="Ex: João Silva"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Nome do Estabelecimento</label>
                            <input
                                name="businessName"
                                value={formData.businessName}
                                onChange={handleChange}
                                required
                                type="text"
                                className="w-full bg-slate-50 border-2 border-slate-200 focus:border-sky-500 focus:bg-white rounded-xl py-3 px-4 outline-none transition-all font-medium text-slate-700"
                                placeholder="Ex: Pousada do Sol"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Email</label>
                                <input
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    type="email"
                                    className="w-full bg-slate-50 border-2 border-slate-200 focus:border-sky-500 focus:bg-white rounded-xl py-3 px-4 outline-none transition-all font-medium text-slate-700"
                                    placeholder="seu@email.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Telefone / WhatsApp</label>
                                <input
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    required
                                    type="tel"
                                    className="w-full bg-slate-50 border-2 border-slate-200 focus:border-sky-500 focus:bg-white rounded-xl py-3 px-4 outline-none transition-all font-medium text-slate-700"
                                    placeholder="(00) 00000-0000"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Mensagem (Opcional)</label>
                            <textarea
                                name="message"
                                value={formData.message}
                                onChange={handleChange}
                                rows={3}
                                className="w-full bg-slate-50 border-2 border-slate-200 focus:border-sky-500 focus:bg-white rounded-xl py-3 px-4 outline-none transition-all font-medium text-slate-700 resize-none"
                                placeholder="Conte um pouco sobre seu negócio..."
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-sky-600 text-white font-bold rounded-xl hover:bg-sky-500 transition-all shadow-lg shadow-sky-500/30 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-4"
                        >
                            {loading ? (
                                'Enviando...'
                            ) : (
                                <>
                                    Enviar Solicitação <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
