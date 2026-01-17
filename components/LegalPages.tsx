
import React from 'react';
import { Shield, Lock, HelpCircle, Mail, FileText, ArrowLeft } from 'lucide-react';

interface PageProps {
    onBack: () => void;
}

export const TermsOfUse: React.FC<PageProps> = ({ onBack }) => (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mb-8 font-bold">
            <ArrowLeft className="w-5 h-5" /> Voltar
        </button>

        <div className="bg-white rounded-[32px] p-8 md:p-12 shadow-xl border border-slate-100">
            <div className="flex items-center gap-4 mb-8 border-b border-slate-100 pb-8">
                <div className="p-4 bg-slate-50 rounded-2xl">
                    <FileText className="w-8 h-8 text-slate-700" />
                </div>
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900">Termos de Uso</h1>
                    <p className="text-slate-500">Última atualização: Janeiro de 2026</p>
                </div>
            </div>

            <div className="prose prose-slate hover:prose-a:text-sky-500 prose-headings:font-bold prose-headings:text-slate-900 text-slate-600 max-w-none">
                <h3>1. Aceitação dos Termos</h3>
                <p>Ao acessar e usar o Go Paraty, você aceita e concorda em estar vinculado a estes termos.</p>

                <h3>2. Uso do Serviço</h3>
                <p>Você concorda em usar nosso serviço apenas para fins legais e de uma maneira que não infrinja os direitos de terceiros ou restrinja o uso do serviço por qualquer outra pessoa.</p>

                <h3>3. Conteúdo do Usuário</h3>
                <p>Ao enviar conteúdo (como avaliações ou fotos), você concede ao Go Paraty uma licença mundial, não exclusiva e livre de royalties para usar, reproduzir e distribuir tal conteúdo.</p>

                <h3>4. Propriedade Intelectual</h3>
                <p>Todo o conteúdo do site, incluindo textos, gráficos, logotipos e código, é propriedade do Go Paraty ou de seus licenciadores e está protegido por leis de direitos autorais.</p>

                <h3>5. Limitação de Responsabilidade</h3>
                <p>O Go Paraty não se responsabiliza por quaisquer danos diretos, indiretos ou consequentes decorrentes do uso ou incapacidade de usar nosso serviço.</p>
            </div>
        </div>
    </div>
);

export const PrivacyPolicy: React.FC<PageProps> = ({ onBack }) => (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mb-8 font-bold">
            <ArrowLeft className="w-5 h-5" /> Voltar
        </button>

        <div className="bg-white rounded-[32px] p-8 md:p-12 shadow-xl border border-slate-100">
            <div className="flex items-center gap-4 mb-8 border-b border-slate-100 pb-8">
                <div className="p-4 bg-emerald-50 rounded-2xl">
                    <Lock className="w-8 h-8 text-emerald-600" />
                </div>
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900">Política de Privacidade</h1>
                    <p className="text-slate-500">Como tratamos seus dados</p>
                </div>
            </div>

            <div className="prose prose-slate prose-headings:font-bold prose-headings:text-slate-900 text-slate-600 max-w-none">
                <h3>1. Coleta de Informações</h3>
                <p>Coletamos informações que você nos fornece diretamente, como quando cria uma conta, anuncia um negócio ou entra em contato conosco.</p>

                <h3>2. Uso das Informações</h3>
                <p>Usamos as informações coletadas para fornecer, manter e melhorar nossos serviços, além de comunicar novidades e promoções (com seu consentimento).</p>

                <h3>3. Compartilhamento de Dados</h3>
                <p>Não vendemos seus dados pessoais. Compartilhamos informações apenas com prestadores de serviços essenciais para a operação da plataforma ou quando exigido por lei.</p>

                <h3>4. Segurança</h3>
                <p>Implementamos medidas de segurança técnicas e organizacionais para proteger seus dados contra acesso não autorizado ou perda.</p>

                <h3>5. Cookies</h3>
                <p>Utilizamos cookies para melhorar sua experiência de navegação e analisar o tráfego do site. Você pode controlar o uso de cookies nas configurações do seu navegador.</p>
            </div>
        </div>
    </div>
);

export const HelpCenter: React.FC<PageProps> = ({ onBack }) => (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mb-8 font-bold">
            <ArrowLeft className="w-5 h-5" /> Voltar
        </button>

        <div className="text-center mb-12">
            <h1 className="text-4xl font-black text-slate-900 mb-4">Central de Ajuda</h1>
            <p className="text-xl text-slate-500">Como podemos ajudar você hoje?</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-lg hover:shadow-xl transition-all group cursor-pointer">
                <div className="w-14 h-14 bg-sky-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <HelpCircle className="w-7 h-7 text-sky-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Perguntas Frequentes</h3>
                <p className="text-slate-500 mb-4">Encontre respostas rápidas para as dúvidas mais comuns.</p>
                <span className="text-sky-600 font-bold text-sm">Ver FAQ &rarr;</span>
            </div>

            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-lg hover:shadow-xl transition-all group cursor-pointer">
                <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Mail className="w-7 h-7 text-amber-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Fale Conosco</h3>
                <p className="text-slate-500 mb-4">Não achou o que procurava? Mande uma mensagem para nosso suporte.</p>
                <span className="text-amber-600 font-bold text-sm">Enviar Email &rarr;</span>
            </div>
        </div>

        <div className="bg-slate-900 rounded-[32px] p-8 md:p-12 text-center text-white relative overflow-hidden">
            <div className="relative z-10">
                <h2 className="text-2xl font-bold mb-4">Ainda precisa de ajuda?</h2>
                <p className="text-slate-400 mb-8 max-w-lg mx-auto">Nossa equipe de suporte está disponível de segunda a sexta, das 9h às 18h.</p>
                <a href="mailto:suporte@goparaty.com.br" className="inline-flex items-center gap-2 px-8 py-4 bg-white text-slate-900 font-bold rounded-2xl hover:bg-slate-100 transition-all">
                    <Mail className="w-5 h-5" /> suporte@goparaty.com.br
                </a>
            </div>
        </div>
    </div>
);
