import React, { useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { SiteSettings } from '../../types';
import { supabase } from '../../supabase';

interface SettingsPanelProps {
    siteSettings: SiteSettings | null;
    setSiteSettings: React.Dispatch<React.SetStateAction<SiteSettings | null>>;
    handleSaveSettings: (e: React.FormEvent) => void;
    isSaving: boolean;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
    siteSettings,
    setSiteSettings,
    handleSaveSettings,
    isSaving
}) => {
    const [uploading, setUploading] = useState(false);

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">Configurações do Site</h1>
                    <p className="text-slate-400 font-medium text-lg">Personalize a aparência e definições globais.</p>
                </div>
            </div>

            <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-xl max-w-3xl">
                <form onSubmit={handleSaveSettings} className="space-y-8">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 mb-6">Imagem de Fundo (Hero)</h3>
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                            <div className="flex gap-4 items-start mb-4">
                                <div className="relative w-48 h-28 rounded-xl overflow-hidden shadow-sm border border-slate-200 bg-white">
                                    {siteSettings?.hero_background_url ? (
                                        <img src={siteSettings.hero_background_url} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400 font-bold text-xs uppercase">Sem Imagem</div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <label className="cursor-pointer bg-white border-2 border-dashed border-slate-300 rounded-xl p-4 flex flex-col items-center justify-center text-slate-500 hover:border-sky-500 hover:text-sky-500 hover:bg-sky-50 transition-all group">
                                        <UploadCloud className="w-6 h-6 mb-2 group-hover:scale-110 transition-transform" />
                                        <span className="text-sm font-bold">{uploading ? 'Enviando...' : 'Fazer Upload de Nova Imagem'}</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={async (e) => {
                                                const files = e.target.files;
                                                if (!files || files.length === 0) return;
                                                setUploading(true);
                                                try {
                                                    const file = files[0];
                                                    const fileExt = file.name.split('.').pop();
                                                    const fileName = `settings/${Math.random().toString(36).substring(2)}.${fileExt}`;
                                                    const { error: uploadError } = await supabase.storage.from('images').upload(fileName, file);
                                                    if (uploadError) throw uploadError;
                                                    const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileName);
                                                    setSiteSettings(prev => prev ? ({ ...prev, hero_background_url: publicUrl }) : ({ id: '', hero_background_url: publicUrl }));
                                                } catch (err) {
                                                    console.error(err);
                                                    alert('Erro no upload');
                                                } finally {
                                                    setUploading(false);
                                                }
                                            }}
                                            disabled={uploading}
                                        />
                                    </label>
                                </div>
                            </div>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">URL</span>
                                <input
                                    type="text"
                                    value={siteSettings?.hero_background_url || ''}
                                    onChange={(e) => setSiteSettings(prev => prev ? ({ ...prev, hero_background_url: e.target.value }) : ({ id: '', hero_background_url: e.target.value }))}
                                    className="w-full bg-white border border-slate-300 rounded-xl py-2 pl-12 pr-4 text-xs font-mono text-slate-500"
                                    placeholder="https://..."
                                />
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end pt-4 border-t border-slate-100">
                        <button
                            type="submit"
                            disabled={isSaving}
                            className={`px-8 py-3 bg-sky-600 text-white rounded-xl font-bold hover:bg-sky-500 shadow-lg shadow-sky-200 transition-all ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {isSaving ? 'Salvando...' : 'Salvar Configurações'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SettingsPanel;
