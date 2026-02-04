
import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, Wifi, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ReloadPrompt: React.FC = () => {
    const { t } = useTranslation();
    const {
        offlineReady: [offlineReady, setOfflineReady],
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            console.log('SW Registered: ' + r);
        },
        onRegisterError(error) {
            console.log('SW registration error', error);
        },
    });

    const close = () => {
        setOfflineReady(false);
        setNeedRefresh(false);
    };

    if (!offlineReady && !needRefresh) return null;

    return (
        <div className="fixed bottom-6 left-6 right-6 md:left-auto md:right-8 md:bottom-8 md:max-w-sm z-[100] animate-in slide-in-from-bottom-10 duration-700">
            <div className="bg-white/80 backdrop-blur-2xl border border-white/50 rounded-3xl p-5 shadow-2xl shadow-coral/10 flex items-start gap-4">
                <div className={`p-3 rounded-2xl flex-shrink-0 ${needRefresh ? 'bg-coral/10 text-coral' : 'bg-emerald-50 text-emerald-600'}`}>
                    {needRefresh ? <RefreshCw className="w-6 h-6 animate-spin-slow" /> : <Wifi className="w-6 h-6" />}
                </div>

                <div className="flex-1 min-w-0 pt-1">
                    <h4 className="text-sm font-black text-ink uppercase tracking-wider mb-1">
                        {needRefresh ? t('pwa.update_available') : t('pwa.offline_ready')}
                    </h4>
                    <p className="text-xs text-ink-light font-medium leading-relaxed">
                        {needRefresh
                            ? t('pwa.update_desc')
                            : t('pwa.offline_desc')}
                    </p>

                    <div className="mt-4 flex gap-3">
                        {needRefresh && (
                            <button
                                onClick={() => updateServiceWorker(true)}
                                className="px-5 py-2 bg-coral text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-coral/20 hover:bg-coral-hover transition-all active:scale-95"
                            >
                                {t('pwa.refresh_button')}
                            </button>
                        )}
                        <button
                            onClick={close}
                            className="px-5 py-2 bg-slate-100 text-ink-light text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-slate-200 transition-all active:scale-95"
                        >
                            {t('common.close') || 'Fechar'}
                        </button>
                    </div>
                </div>

                <button
                    onClick={close}
                    className="p-1 hover:bg-black/5 rounded-full text-ink-light/40 hover:text-ink-light transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default ReloadPrompt;
