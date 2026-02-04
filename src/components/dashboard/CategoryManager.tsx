import React from 'react';
import { Plus, Edit3, Trash2, Check } from 'lucide-react';
import { Category } from '../../types';

interface CategoryManagerProps {
    categories: Category[];
    isAddingCategory: boolean;
    setIsAddingCategory: (val: boolean) => void;
    editingCategory: Category | null;
    setEditingCategory: (cat: Category | null) => void;
    handleSaveCategory: (e: React.FormEvent) => void;
    handleDeleteCategory: (id: string) => void;
}

const CategoryManager: React.FC<CategoryManagerProps> = ({
    categories,
    isAddingCategory,
    setIsAddingCategory,
    editingCategory,
    setEditingCategory,
    handleSaveCategory,
    handleDeleteCategory
}) => {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">Categorias</h1>
                    <p className="text-slate-400 font-medium text-lg">Gerencie as categorias de estabelecimentos.</p>
                </div>
                <button
                    onClick={() => { setIsAddingCategory(true); setEditingCategory(null); }}
                    className="px-6 py-3 bg-slate-900 text-white font-bold rounded-2xl shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" /> Nova Categoria
                </button>
            </div>

            {isAddingCategory && (
                <div className="bg-white rounded-[32px] p-8 mb-8 border border-slate-100 shadow-xl max-w-2xl">
                    <h3 className="text-xl font-bold mb-6">{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</h3>
                    <form onSubmit={handleSaveCategory} className="flex gap-4 items-end">
                        <div className="flex-1">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Nome</label>
                            <input
                                name="name"
                                className="w-full bg-white border-2 border-slate-300 focus:border-sky-500 rounded-xl py-3 px-4 font-bold text-slate-900"
                                placeholder="Ex: Vida Noturna"
                                defaultValue={editingCategory?.name}
                                required
                            />
                        </div>
                        <button type="button" onClick={() => { setIsAddingCategory(false); setEditingCategory(null); }} className="px-6 py-3 text-slate-500 font-bold">Cancelar</button>
                        <button type="submit" className="px-8 py-3 bg-sky-600 text-white rounded-xl font-bold hover:bg-sky-500">Salvar</button>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categories.map(c => (
                    <div key={c.id} className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm flex items-center justify-between group hover:border-sky-500 hover:shadow-md transition-all">
                        <div>
                            <h3 className="font-bold text-lg text-slate-900 group-hover:text-sky-600 transition-colors">{c.name}</h3>
                            <p className="text-xs text-slate-500 font-bold font-mono mt-1 bg-slate-100 px-2 py-1 rounded-lg inline-block">{c.slug}</p>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => { setEditingCategory(c); setIsAddingCategory(true); }}
                                className="p-2 text-slate-400 hover:text-sky-600 bg-slate-50 hover:bg-sky-50 rounded-lg transition-colors"
                            >
                                <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handleDeleteCategory(c.id)}
                                className="p-2 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CategoryManager;
