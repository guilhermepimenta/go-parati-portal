
import React, { useState, useEffect } from 'react';
import { Trash2, UploadCloud, Plus, Image as ImageIcon, Check } from 'lucide-react';
import { supabase } from '../supabase';
import { FeedPost } from '../types';

interface AdminFeedManagerProps {
    onUpdate?: () => void;
}

const AdminFeedManager: React.FC<AdminFeedManagerProps> = ({ onUpdate }) => {
    const [posts, setPosts] = useState<FeedPost[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [newCaption, setNewCaption] = useState('');
    const [uploadError, setUploadError] = useState<string | null>(null);

    // Fetch Posts
    const fetchPosts = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('feed_posts')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPosts(data || []);
        } catch (err: any) {
            console.error('Error fetching feed:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPosts();
    }, []);

    // Handle Upload
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);
        setUploadError(null);

        try {
            const file = files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `feed/${Math.random().toString(36).substring(2)}.${fileExt}`;

            // 1. Upload Image to 'feed-images' bucket (or 'images' detailed in plan)
            // Trying 'feed-images' first, assuming user follows plan. Fallback could be 'images' strictly.
            // Let's stick to 'feed-images' as per plan, but use 'images' if fail? 
            // Safest is to try 'feed-images' as that separates concerns.
            const bucketName = 'feed-images';

            const { error: uploadError } = await supabase.storage
                .from(bucketName)
                .upload(fileName, file);

            if (uploadError) {
                // If bucket doesn't exist, user might need to create it.
                throw new Error(`Erro no upload (${bucketName}): ${uploadError.message}`);
            }

            const { data: { publicUrl } } = supabase.storage
                .from(bucketName)
                .getPublicUrl(fileName);

            // 2. Insert into DB
            const { error: dbError } = await supabase
                .from('feed_posts')
                .insert([{
                    image_url: publicUrl,
                    caption: newCaption || 'Nova publicação',
                    likes: Math.floor(Math.random() * 50) + 10, // Mock initial likes
                    active: true
                }]);

            if (dbError) throw dbError;

            setNewCaption(''); // Reset caption
            fetchPosts();      // Refresh list
            if (onUpdate) onUpdate();

        } catch (err: any) {
            console.error('Upload process failed:', err);
            setUploadError(err.message || 'Erro ao fazer upload. Verifique se o bucket "feed-images" existe e é público.');
        } finally {
            setIsUploading(false);
        }
    };

    // Handle Delete
    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja apagar este post?')) return;

        try {
            const { error } = await supabase
                .from('feed_posts')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchPosts();
        } catch (err) {
            alert('Erro ao deletar post');
        }
    };

    // Toggle Active Status
    const toggleActive = async (post: FeedPost) => {
        try {
            const { error } = await supabase
                .from('feed_posts')
                .update({ active: !post.active })
                .eq('id', post.id);

            if (error) throw error;
            fetchPosts();
        } catch (err) {
            console.error('Error toggling status', err);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-900">Feed "Ao Vivo"</h2>
                    <p className="text-slate-500">Adicione fotos do dia-a-dia de Paraty para o widget da Home.</p>
                </div>
            </div>

            {/* Upload Section */}
            <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-emerald-500" /> Nova Publicação
                </h3>

                <div className="flex flex-col gap-4">
                    <div className="flex flex-col">
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1">Legenda (Opcional)</label>
                        <input
                            type="text"
                            value={newCaption}
                            onChange={(e) => setNewCaption(e.target.value)}
                            placeholder="Ex: Sol lindo no Cais hoje! ☀️"
                            className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                    </div>

                    <div className="relative group">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            disabled={isUploading}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                        />
                        <div className={`border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center transition-all ${isUploading ? 'bg-slate-50' : 'group-hover:border-emerald-400 group-hover:bg-emerald-50/30'}`}>
                            {isUploading ? (
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mb-2"></div>
                            ) : (
                                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full mb-3">
                                    <UploadCloud className="w-6 h-6" />
                                </div>
                            )}
                            <p className="font-bold text-slate-700">
                                {isUploading ? 'Enviando...' : 'Clique ou arraste uma foto aqui'}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">JPG, PNG (Max 5MB)</p>
                        </div>
                    </div>

                    {uploadError && (
                        <div className="p-4 bg-rose-50 text-rose-600 text-sm rounded-xl border border-rose-100">
                            ⚠️ {uploadError}
                        </div>
                    )}
                </div>
            </div>

            {/* Posts List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {posts.map((post) => (
                    <div key={post.id} className={`group relative bg-white rounded-2xl overflow-hidden border transition-all ${post.active ? 'border-slate-100 shadow-sm' : 'border-slate-200 opacity-60 grayscale'}`}>
                        <div className="aspect-square relative">
                            <img src={post.image_url} alt={post.caption} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button
                                    onClick={() => toggleActive(post)}
                                    className="p-2 bg-white rounded-full hover:bg-emerald-50 text-emerald-600 transition-colors"
                                    title={post.active ? "Desativar" : "Ativar"}
                                >
                                    <Check className={`w-5 h-5 ${post.active ? 'opacity-100' : 'opacity-30'}`} />
                                </button>
                                <button
                                    onClick={() => handleDelete(post.id)}
                                    className="p-2 bg-white rounded-full hover:bg-rose-50 text-rose-600 transition-colors"
                                    title="Excluir"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="p-4">
                            <p className="text-sm font-bold text-slate-800 line-clamp-2 min-h-[40px]">
                                {post.caption || "Sem legenda"}
                            </p>
                            <div className="flex items-center justify-between mt-3 text-xs text-slate-400">
                                <span>❤️ {post.likes}</span>
                                <span>{new Date(post.created_at || '').toLocaleDateString('pt-BR')}</span>
                            </div>
                        </div>
                    </div>
                ))}

                {posts.length === 0 && !isLoading && (
                    <div className="col-span-full py-12 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-3xl">
                        <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>Nenhuma publicação no feed ainda.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminFeedManager;
