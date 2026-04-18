import React, { useState, useEffect } from 'react';
import {
  Plus, Edit3, Trash2, Eye, Search, Loader2, Sparkles, Save, X,
  FileText, Calendar, Tag, ChevronDown, AlertCircle, Check, RefreshCw
} from 'lucide-react';
import { supabase } from '../../supabase';
import { BlogPost, BlogCategory } from '../../types';

const CATEGORY_OPTIONS: { value: BlogCategory; label: string }[] = [
  { value: 'noticias', label: 'Notícias' },
  { value: 'turismo', label: 'Turismo' },
  { value: 'eventos', label: 'Eventos' },
  { value: 'gastronomia', label: 'Gastronomia' },
  { value: 'historia', label: 'História' },
  { value: 'dicas', label: 'Dicas' },
];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Rascunho', color: 'bg-gray-100 text-gray-600' },
  published: { label: 'Publicado', color: 'bg-green-100 text-green-700' },
  archived: { label: 'Arquivado', color: 'bg-amber-100 text-amber-700' },
};

// AI Topic suggestions for quick generation
const AI_TOPIC_SUGGESTIONS = [
  'Melhores praias de Paraty para famílias com crianças',
  'Roteiro de 3 dias em Paraty: o guia definitivo',
  'Os alambiques de cachaça que você precisa conhecer',
  'Trilhas e cachoeiras imperdíveis em Paraty',
  'Gastronomia caiçara: onde comer em Paraty',
  'Centro histórico de Paraty: o que visitar',
  'FLIP — Festa Literária Internacional de Paraty',
  'Passeios de barco pelas ilhas de Paraty',
  'Paraty com chuva: o que fazer em dias nublados',
  'Estacionamento em Paraty: guia do Rotativo Digital',
];

const BlogEditor: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // AI generation
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiCategory, setAiCategory] = useState<BlogCategory>('turismo');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiImproving, setAiImproving] = useState(false);

  // Form fields
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [category, setCategory] = useState<BlogCategory>('turismo');
  const [metaDescription, setMetaDescription] = useState('');
  const [tags, setTags] = useState('');
  const [status, setStatus] = useState<'draft' | 'published' | 'archived'>('draft');

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) setPosts(data as BlogPost[]);
    setLoading(false);
  };

  const filteredPosts = posts.filter(p =>
    !searchQuery || p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetForm = () => {
    setTitle(''); setSlug(''); setExcerpt(''); setContent('');
    setCoverImageUrl(''); setCategory('turismo'); setMetaDescription('');
    setTags(''); setStatus('draft'); setEditingPost(null);
  };

  const openEditor = (post?: BlogPost) => {
    if (post) {
      setEditingPost(post);
      setTitle(post.title);
      setSlug(post.slug);
      setExcerpt(post.excerpt || '');
      setContent(post.content);
      setCoverImageUrl(post.cover_image_url || '');
      setCategory(post.category);
      setMetaDescription(post.meta_description || '');
      setTags((post.tags || []).join(', '));
      setStatus(post.status);
    } else {
      resetForm();
    }
    setIsEditing(true);
    setError('');
    setSuccess('');
  };

  const slugify = (text: string) =>
    text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!editingPost) setSlug(slugify(val));
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      setError('Título e conteúdo são obrigatórios.');
      return;
    }

    setSaving(true);
    setError('');

    const record = {
      title: title.trim(),
      slug: slug || slugify(title),
      excerpt: excerpt.trim() || null,
      content: content.trim(),
      cover_image_url: coverImageUrl.trim() || null,
      category,
      meta_description: metaDescription.trim() || excerpt.trim() || null,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      status,
      published_at: status === 'published' ? (editingPost?.published_at || new Date().toISOString()) : null,
    };

    let result;
    if (editingPost) {
      result = await supabase.from('blog_posts').update(record).eq('id', editingPost.id).select().single();
    } else {
      result = await supabase.from('blog_posts').insert(record).select().single();
    }

    if (result.error) {
      setError(result.error.message.includes('duplicate')
        ? 'Já existe um post com esse slug. Altere o título ou slug.'
        : result.error.message);
    } else {
      setSuccess(editingPost ? 'Post atualizado!' : 'Post criado!');
      fetchPosts();
      setTimeout(() => { setIsEditing(false); setSuccess(''); resetForm(); }, 1200);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este post?')) return;
    await supabase.from('blog_posts').delete().eq('id', id);
    fetchPosts();
  };

  // ── AI Generation ──
  const handleAiGenerate = async () => {
    if (!aiTopic.trim()) return;
    setAiGenerating(true);
    setError('');

    try {
      const { data, error: fnErr } = await supabase.functions.invoke('generate-blog-post', {
        body: { action: 'generate', topic: aiTopic, category: aiCategory },
      });

      if (fnErr) throw fnErr;

      // Populate form with AI output
      setTitle(data.title || '');
      setSlug(data.slug || slugify(data.title || aiTopic));
      setExcerpt(data.excerpt || '');
      setContent(data.content || '');
      setMetaDescription(data.meta_description || '');
      setTags((data.tags || []).join(', '));
      setCategory(data.category || aiCategory);
      setStatus('draft');
      setEditingPost(null);

      setShowAiModal(false);
      setIsEditing(true);
      setSuccess('Conteúdo gerado pela IA! Revise antes de publicar.');
      setTimeout(() => setSuccess(''), 4000);
    } catch (e: any) {
      setError(`Erro na geração IA: ${e.message || e}`);
    }
    setAiGenerating(false);
  };

  const handleAiImprove = async () => {
    if (!content.trim()) return;
    setAiImproving(true);
    setError('');

    try {
      const { data, error: fnErr } = await supabase.functions.invoke('generate-blog-post', {
        body: { action: 'improve', content },
      });

      if (fnErr) throw fnErr;
      setContent(data.content || content);
      setSuccess('Texto melhorado pela IA!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) {
      setError(`Erro ao melhorar: ${e.message || e}`);
    }
    setAiImproving(false);
  };

  // ── LIST VIEW ──
  if (!isEditing) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-xl font-bold text-slate-200 flex items-center gap-2">
            <FileText className="w-5 h-5 text-sky-400" />
            Blog ({posts.length} posts)
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAiModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              <Sparkles className="w-4 h-4" /> Gerar com IA
            </button>
            <button
              onClick={() => openEditor()}
              className="flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" /> Novo Post
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar posts..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
          />
        </div>

        {/* Posts List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            {searchQuery ? 'Nenhum post encontrado.' : 'Nenhum post ainda. Crie o primeiro!'}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPosts.map(post => (
              <div key={post.id} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex items-center gap-4 hover:bg-slate-800/60 transition-colors">
                {/* Thumbnail */}
                {post.cover_image_url ? (
                  <img src={post.cover_image_url} alt="" className="w-16 h-12 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-16 h-12 rounded-lg bg-slate-700 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-slate-500" />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white text-sm truncate">{post.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_LABELS[post.status]?.color}`}>
                      {STATUS_LABELS[post.status]?.label}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {CATEGORY_OPTIONS.find(c => c.value === post.category)?.label}
                    </span>
                    {post.ai_generated && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-violet-900/50 text-violet-400">IA</span>
                    )}
                    <span className="text-[11px] text-slate-600">
                      {new Date(post.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEditor(post)} className="p-2 hover:bg-slate-700 rounded-lg transition-colors" title="Editar">
                    <Edit3 className="w-4 h-4 text-slate-400" />
                  </button>
                  <button onClick={() => handleDelete(post.id)} className="p-2 hover:bg-red-900/50 rounded-lg transition-colors" title="Excluir">
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* AI Generation Modal */}
        {showAiModal && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-violet-400" /> Gerar Post com IA
                </h3>
                <button onClick={() => setShowAiModal(false)} className="p-1 hover:bg-slate-800 rounded-lg">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <p className="text-sm text-slate-400 mb-4">
                Descreva o tema do artigo. A IA vai gerar título, conteúdo, excerpt e tags automaticamente usando Gemini 2.5 Flash.
              </p>

              {/* Topic */}
              <label className="text-xs font-semibold text-slate-400 uppercase mb-1 block">Tema do artigo</label>
              <textarea
                value={aiTopic}
                onChange={e => setAiTopic(e.target.value)}
                placeholder="Ex: Melhores praias de Paraty para famílias com crianças"
                rows={3}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none mb-3"
              />

              {/* Category */}
              <label className="text-xs font-semibold text-slate-400 uppercase mb-1 block">Categoria</label>
              <select
                value={aiCategory}
                onChange={e => setAiCategory(e.target.value as BlogCategory)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:border-violet-500 focus:outline-none mb-4"
              >
                {CATEGORY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              {/* Quick suggestions */}
              <label className="text-xs font-semibold text-slate-400 uppercase mb-2 block">Sugestões rápidas</label>
              <div className="flex flex-wrap gap-1.5 mb-4 max-h-24 overflow-y-auto">
                {AI_TOPIC_SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => setAiTopic(s)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-violet-900/50 border border-slate-700 rounded-lg text-[11px] text-slate-300 hover:text-violet-300 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>

              {error && (
                <div className="p-3 bg-red-900/30 border border-red-800 rounded-xl text-sm text-red-300 mb-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
                </div>
              )}

              <button
                onClick={handleAiGenerate}
                disabled={aiGenerating || !aiTopic.trim()}
                className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                {aiGenerating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Gerando com Gemini...</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Gerar Artigo</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── EDITOR VIEW ──
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-200">
          {editingPost ? 'Editar Post' : 'Novo Post'}
        </h2>
        <button onClick={() => { setIsEditing(false); resetForm(); }} className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors">
          <X className="w-4 h-4" /> Cancelar
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-900/30 border border-red-800 rounded-xl text-sm text-red-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-900/30 border border-green-800 rounded-xl text-sm text-green-300 flex items-start gap-2">
          <Check className="w-4 h-4 mt-0.5 shrink-0" /> {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase mb-1 block">Título *</label>
            <input
              type="text"
              value={title}
              onChange={e => handleTitleChange(e.target.value)}
              placeholder="Título do artigo"
              className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white text-sm focus:border-sky-500 focus:outline-none"
            />
          </div>

          {/* Slug */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase mb-1 block">Slug (URL)</label>
            <input
              type="text"
              value={slug}
              onChange={e => setSlug(e.target.value)}
              placeholder="titulo-do-artigo"
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-300 text-xs font-mono focus:border-sky-500 focus:outline-none"
            />
          </div>

          {/* Excerpt */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase mb-1 block">Resumo (Excerpt)</label>
            <textarea
              value={excerpt}
              onChange={e => setExcerpt(e.target.value)}
              placeholder="Resumo curto do artigo (aparece na listagem)"
              rows={2}
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white text-sm focus:border-sky-500 focus:outline-none"
            />
          </div>

          {/* Content */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-400 uppercase">Conteúdo (Markdown) *</label>
              <button
                onClick={handleAiImprove}
                disabled={aiImproving || !content.trim()}
                className="flex items-center gap-1 px-2.5 py-1 bg-violet-900/40 hover:bg-violet-800/50 text-violet-300 rounded-lg text-[11px] font-semibold disabled:opacity-50 transition-colors"
              >
                {aiImproving ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                Melhorar com IA
              </button>
            </div>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Escreva o conteúdo em Markdown..."
              rows={18}
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white text-sm font-mono leading-relaxed focus:border-sky-500 focus:outline-none"
            />
            <p className="text-[11px] text-slate-600 mt-1">
              {content.split(/\s+/).filter(Boolean).length} palavras
            </p>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 space-y-3">
            <label className="text-xs font-semibold text-slate-400 uppercase block">Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:border-sky-500 focus:outline-none"
            >
              <option value="draft">Rascunho</option>
              <option value="published">Publicado</option>
              <option value="archived">Arquivado</option>
            </select>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Salvando...' : 'Salvar Post'}
            </button>
          </div>

          {/* Category */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase block">Categoria</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as BlogCategory)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:border-sky-500 focus:outline-none"
            >
              {CATEGORY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Cover Image */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase block">Imagem de Capa (URL)</label>
            <input
              type="url"
              value={coverImageUrl}
              onChange={e => setCoverImageUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:border-sky-500 focus:outline-none"
            />
            {coverImageUrl && (
              <img src={coverImageUrl} alt="Preview" className="w-full aspect-video rounded-lg object-cover mt-2" />
            )}
          </div>

          {/* Tags */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase block">Tags (separadas por vírgula)</label>
            <input
              type="text"
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="praia, turismo, família"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:border-sky-500 focus:outline-none"
            />
          </div>

          {/* SEO */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase block">Meta Description (SEO)</label>
            <textarea
              value={metaDescription}
              onChange={e => setMetaDescription(e.target.value)}
              placeholder="Descrição para motores de busca (máx 155 chars)"
              rows={3}
              maxLength={160}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:border-sky-500 focus:outline-none"
            />
            <p className="text-[11px] text-slate-600">{metaDescription.length}/155 caracteres</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogEditor;
