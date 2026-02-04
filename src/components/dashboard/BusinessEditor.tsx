import React from 'react';
import { ChevronRight, Check, ImageIcon, UploadCloud, Plus, Bold, List, MapPin, Search } from 'lucide-react';
import { Business, Category } from '../../types';

interface BusinessEditorProps {
    editingBusiness: Business;
    setEditingBusiness: (b: Business | null) => void;
    categories: Category[];
    handleSaveBusiness: () => void;
    setIsAddingNew: (val: boolean) => void;
    handleFileUpload: (files: FileList | null, field: 'image_url' | 'gallery') => void;
    uploading: boolean;
    handleGeocode: () => void;
}

const BusinessEditor: React.FC<BusinessEditorProps> = ({
    editingBusiness,
    setEditingBusiness,
    categories,
    handleSaveBusiness,
    setIsAddingNew,
    handleFileUpload,
    uploading,
    handleGeocode
}) => {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <button
                            onClick={() => { setEditingBusiness(null); setIsAddingNew(false); }}
                            className="text-slate-400 hover:text-slate-600 flex items-center gap-2 mb-2 font-bold text-sm transition-colors"
                        >
                            <ChevronRight className="w-4 h-4 rotate-180" /> Voltar para lista
                        </button>
                        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
                            {editingBusiness.id ? 'Editar Registro' : 'Novo Estabelecimento'}
                        </h1>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => { setEditingBusiness(null); setIsAddingNew(false); }}
                            className="px-6 py-3 bg-white text-slate-500 font-bold rounded-2xl hover:bg-slate-50 border border-slate-200 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSaveBusiness}
                            className="px-8 py-3 bg-sky-600 text-white font-bold rounded-2xl shadow-lg shadow-sky-200 hover:bg-sky-500 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                        >
                            <Check className="w-5 h-5" /> Salvar Alterações
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Basic Info */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 space-y-6">
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest px-1">Informações Básicas</label>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-2">
                                    <label className="block text-sm font-bold text-slate-700 mb-2 px-1">Nome do Local</label>
                                    <input
                                        type="text"
                                        value={editingBusiness.name}
                                        onChange={(e) => setEditingBusiness({ ...editingBusiness, name: e.target.value })}
                                        className="w-full bg-white border-2 border-slate-300 focus:border-sky-500 rounded-xl py-3 px-4 font-bold text-slate-900 outline-none transition-all placeholder:font-normal"
                                        placeholder="Ex: Restaurante do Porto"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2 px-1">Categoria</label>
                                    <select
                                        value={editingBusiness.category}
                                        onChange={(e) => setEditingBusiness({ ...editingBusiness, category: e.target.value as unknown as Category })}
                                        className="w-full bg-white border-2 border-slate-300 focus:border-sky-500 rounded-xl py-3 px-4 font-bold text-slate-900 outline-none cursor-pointer appearance-none transition-all"
                                    >
                                        {categories.map(c => (
                                            <option key={c.id} value={c.name}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2 px-1">Preço (1-4)</label>
                                    <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-300">
                                        {[1, 2, 3, 4].map((level) => (
                                            <button
                                                key={level}
                                                onClick={() => setEditingBusiness({ ...editingBusiness, price_level: level })}
                                                className={`flex-1 py-2 rounded-lg text-sm font-black transition-all ${editingBusiness.price_level === level
                                                    ? 'bg-sky-600 text-white shadow-md'
                                                    : 'text-slate-400 hover:text-slate-600'
                                                    }`}
                                            >
                                                {'$'.repeat(level)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="col-span-2 grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2 px-1">Avaliação (0-5)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="5"
                                            step="0.1"
                                            value={editingBusiness.rating || 0}
                                            onChange={(e) => setEditingBusiness({ ...editingBusiness, rating: parseFloat(e.target.value) })}
                                            className="w-full bg-white border-2 border-slate-300 focus:border-sky-500 rounded-xl py-3 px-4 font-bold text-slate-900 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="flex items-end pb-3">
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${editingBusiness.is_featured ? 'bg-sky-600 border-sky-600' : 'bg-white border-slate-300 group-hover:border-sky-400'}`}>
                                                {editingBusiness.is_featured && <Check className="w-4 h-4 text-white" />}
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={editingBusiness.is_featured || false}
                                                onChange={(e) => setEditingBusiness({ ...editingBusiness, is_featured: e.target.checked })}
                                                className="hidden"
                                            />
                                            <span className="font-bold text-slate-700 select-none">Marcar como Destaque</span>
                                        </label>
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-bold text-slate-700 mb-2 px-1">Breve Descrição</label>
                                    <textarea
                                        value={editingBusiness.description}
                                        onChange={(e) => setEditingBusiness({ ...editingBusiness, description: e.target.value })}
                                        className="w-full bg-white border-2 border-slate-300 focus:border-sky-500 rounded-xl py-3 px-4 font-medium text-slate-700 outline-none h-24 resize-none transition-all"
                                        placeholder="Resumo curto para o card principal..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Location Section */}
                        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 space-y-6">
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest px-1">Localização</label>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-bold text-slate-700 mb-2 px-1">Endereço Completo</label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                type="text"
                                                value={editingBusiness.location.address}
                                                onChange={(e) => setEditingBusiness({
                                                    ...editingBusiness,
                                                    location: { ...editingBusiness.location, address: e.target.value }
                                                })}
                                                className="w-full bg-white border-2 border-slate-300 focus:border-sky-500 rounded-xl py-3 pl-12 pr-4 font-medium text-slate-700 outline-none transition-all placeholder:font-normal"
                                                placeholder="Rua Principal, 123 - Centro Histórico"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleGeocode}
                                            className="px-4 bg-sky-50 text-sky-600 border-2 border-sky-100 hover:bg-sky-100 hover:border-sky-200 rounded-xl font-bold text-xs flex items-center gap-2 transition-all"
                                            title="Buscar Latitude/Longitude"
                                        >
                                            <Search className="w-4 h-4" /> Buscar
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-2 px-1">
                                        💡 Dica: Digite o endereço e clique em "Buscar" para preencher Lat/Long automaticamente.
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2 px-1">Latitude</label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={editingBusiness.location.lat}
                                        onChange={(e) => setEditingBusiness({
                                            ...editingBusiness,
                                            location: { ...editingBusiness.location, lat: parseFloat(e.target.value) }
                                        })}
                                        className="w-full bg-white border-2 border-slate-300 focus:border-sky-500 rounded-xl py-3 px-4 font-mono text-xs font-bold text-slate-700 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2 px-1">Longitude</label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={editingBusiness.location.lng}
                                        onChange={(e) => setEditingBusiness({
                                            ...editingBusiness,
                                            location: { ...editingBusiness.location, lng: parseFloat(e.target.value) }
                                        })}
                                        className="w-full bg-white border-2 border-slate-300 focus:border-sky-500 rounded-xl py-3 px-4 font-mono text-xs font-bold text-slate-700 outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Images & Extra */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 space-y-6">
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest px-1">Imagens</label>

                            {/* Main Image Preview */}
                            <div className="relative aspect-video rounded-3xl overflow-hidden shadow-inner bg-slate-100 mb-4 group flex items-center justify-center">
                                {editingBusiness.image_url ? (
                                    <img
                                        src={editingBusiness.image_url}
                                        className="w-full h-full object-cover"
                                        alt="Preview"
                                        onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement?.classList.add('bg-slate-200'); }}
                                    />
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-slate-400">
                                        <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
                                        <span className="text-xs font-bold uppercase tracking-widest opacity-70">Sem Imagem</span>
                                    </div>
                                )}
                                {uploading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold">Enviando...</div>}
                            </div>

                            {/* Main Image Input */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2 px-1">Imagem Principal</label>
                                <div className="flex gap-2">
                                    <label className="flex-1 cursor-pointer bg-white border-2 border-dashed border-slate-300 rounded-xl py-3 px-4 text-center text-slate-500 hover:border-sky-500 hover:text-sky-500 hover:bg-sky-50 transition-all group">
                                        <span className="text-sm font-bold flex items-center justify-center gap-2">
                                            <UploadCloud className="w-4 h-4" /> Escolher Arquivo
                                        </span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => handleFileUpload(e.target.files, 'image_url')}
                                            disabled={uploading}
                                        />
                                    </label>
                                </div>
                                <div className="text-center my-2 text-xs text-slate-400 font-bold uppercase">- OU -</div>
                                <input
                                    type="text"
                                    value={editingBusiness.image_url}
                                    onChange={(e) => setEditingBusiness({ ...editingBusiness, image_url: e.target.value })}
                                    className="w-full bg-white border-2 border-slate-300 focus:border-sky-500 rounded-xl py-3 px-4 font-mono text-xs font-bold text-slate-700 outline-none transition-all placeholder:font-normal"
                                    placeholder="Cole uma URL externa aqui..."
                                />
                            </div>

                            {/* Gallery Input */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2 px-1">Galeria de Fotos</label>
                                <div className="mb-4">
                                    <label className="w-full block cursor-pointer bg-white border-2 border-dashed border-slate-300 rounded-xl py-4 text-center text-slate-500 hover:border-sky-500 hover:text-sky-500 hover:bg-sky-50 transition-all group">
                                        <span className="text-sm font-bold flex items-center justify-center gap-2">
                                            <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" /> Adicionar Várias Fotos
                                        </span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            className="hidden"
                                            onChange={(e) => handleFileUpload(e.target.files, 'gallery')}
                                            disabled={uploading}
                                        />
                                    </label>
                                </div>

                                <textarea
                                    className="w-full bg-white border-2 border-slate-300 focus:border-sky-500 rounded-xl py-3 px-4 font-mono text-xs font-bold text-slate-700 outline-none min-h-[100px] whitespace-pre transition-all placeholder:font-normal"
                                    value={editingBusiness.gallery?.join('\n') || ''}
                                    onChange={(e) => setEditingBusiness({
                                        ...editingBusiness,
                                        gallery: e.target.value.split('\n').map(s => s.trim()).filter(Boolean)
                                    })}
                                    placeholder="As URLs aparecerão aqui automaticamente..."
                                />
                            </div>
                        </div>

                        <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden flex flex-col h-[500px]">
                            <div className="px-8 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Descrição Completa</label>
                                <div className="flex items-center gap-1">
                                    <button className="p-2 text-slate-400 hover:bg-white rounded-lg transition-colors"><Bold className="w-4 h-4" /></button>
                                    <button className="p-2 text-slate-400 hover:bg-white rounded-lg transition-colors"><List className="w-4 h-4" /></button>
                                </div>
                            </div>
                            <div className="p-8 flex-grow">
                                <textarea
                                    className="w-full h-full bg-transparent text-slate-600 font-medium text-lg leading-relaxed focus:outline-none resize-none"
                                    value={editingBusiness.long_description || editingBusiness.description}
                                    onChange={(e) => setEditingBusiness({ ...editingBusiness, long_description: e.target.value })}
                                    placeholder="Escreva todos os detalhes sobre o local aqui..."
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BusinessEditor;
