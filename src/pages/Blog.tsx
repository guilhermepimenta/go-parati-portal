import React, { useState, useEffect } from 'react';
import { Search, Calendar, ChevronRight, Loader2 } from 'lucide-react';
import { supabase } from '../supabase';
import { BlogPost, BlogCategory } from '../types';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';

const CATEGORY_LABELS: Record<BlogCategory, string> = {
  noticias: 'Notícias',
  turismo: 'Turismo',
  eventos: 'Eventos',
  gastronomia: 'Gastronomia',
  historia: 'História',
  dicas: 'Dicas',
};

const CATEGORY_COLORS: Record<BlogCategory, string> = {
  noticias: 'bg-blue-100 text-blue-700',
  turismo: 'bg-emerald-100 text-emerald-700',
  eventos: 'bg-purple-100 text-purple-700',
  gastronomia: 'bg-amber-100 text-amber-700',
  historia: 'bg-rose-100 text-rose-700',
  dicas: 'bg-cyan-100 text-cyan-700',
};

interface BlogProps {
  onNavigate: (view: string) => void;
  onBack: () => void;
}

const Blog: React.FC<BlogProps> = ({ onNavigate, onBack }) => {
  console.log('[Blog] Componente montado');
  const { t } = useTranslation();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<BlogCategory | ''>('');

  useEffect(() => {
    console.log('[Blog] useEffect chamado');
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      console.log('[Blog] Antes do fetch Supabase');
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, cover_image_url, category, author_name, ai_generated, published_at, created_at')
        .eq('status', 'published')
        .order('published_at', { ascending: false });
      console.log('[Blog] Depois do fetch Supabase');
      console.log('[Blog] fetchPosts result:', { data, error });
      if (error) {
        console.error('[Blog] Erro ao buscar posts:', error);
      }
      if (!error && data) setPosts(data as BlogPost[]);
    } catch (e) {
      console.error('[Blog] Exceção inesperada em fetchPosts:', e);
    }
    setLoading(false);
  };

  const filteredPosts = posts.filter(post => {
    const matchesSearch = !searchQuery ||
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (post.excerpt || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || post.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <>
      <Helmet>
        <title>Blog — Go Paraty</title>
        <meta name="description" content="Notícias, dicas de turismo, eventos e cultura de Paraty, RJ." />
      </Helmet>

      <div className="min-h-screen bg-surface">
        {/* Header */}
        <div className="bg-gradient-to-br from-coral/10 via-white to-sky-50 pt-6 pb-12 px-4">
          <div className="max-w-4xl mx-auto">
            <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted hover:text-ink mb-6 transition-colors">
              <ChevronRight className="w-4 h-4 rotate-180" /> Voltar
            </button>
            <h1 className="text-3xl sm:text-4xl font-black text-ink mb-3">
              {t('blog.title', 'Blog Go Paraty')}
            </h1>
            <p className="text-muted max-w-xl">
              {t('blog.subtitle', 'Notícias, dicas e histórias sobre a cidade mais encantadora do litoral carioca.')}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="max-w-4xl mx-auto px-4 -mt-6">
          <div className="bg-white rounded-2xl shadow-lg border border-border p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t('blog.search', 'Buscar artigos...')}
                className="w-full pl-10 pr-4 py-2.5 border border-border rounded-xl text-sm focus:border-coral focus:outline-none"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedCategory('')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  !selectedCategory ? 'bg-coral text-white' : 'bg-surface text-muted hover:bg-gray-100'
                }`}
              >
                Todas
              </button>
              {(Object.keys(CATEGORY_LABELS) as BlogCategory[]).map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                    selectedCategory === cat ? 'bg-coral text-white' : 'bg-surface text-muted hover:bg-gray-100'
                  }`}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Posts */}
        <div className="max-w-4xl mx-auto px-4 py-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-coral" />
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted text-lg">
                {searchQuery || selectedCategory
                  ? 'Nenhum artigo encontrado com esses filtros.'
                  : 'Nenhum artigo publicado ainda. Volte em breve!'}
              </p>
            </div>
          ) : (
            <div className="grid gap-6">
              {/* Featured (first post) */}
              <article
                onClick={() => onNavigate(`blog/${filteredPosts[0].slug}`)}
                className="group cursor-pointer bg-white rounded-2xl shadow-md border border-border overflow-hidden hover:shadow-xl transition-all duration-300"
              >
                {filteredPosts[0].cover_image_url && (
                  <div className="aspect-[2/1] overflow-hidden">
                    <img
                      src={filteredPosts[0].cover_image_url}
                      alt={filteredPosts[0].title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${CATEGORY_COLORS[filteredPosts[0].category]}`}>
                      {CATEGORY_LABELS[filteredPosts[0].category]}
                    </span>
                    {filteredPosts[0].ai_generated && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-600">✦ IA</span>
                    )}
                    <span className="text-xs text-muted flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(filteredPosts[0].published_at || filteredPosts[0].created_at)}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-ink group-hover:text-coral transition-colors mb-2">
                    {filteredPosts[0].title}
                  </h2>
                  <p className="text-muted text-sm line-clamp-2">{filteredPosts[0].excerpt}</p>
                  <div className="mt-4 flex items-center text-coral font-semibold text-sm">
                    Ler artigo <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </article>

              {/* Grid */}
              <div className="grid sm:grid-cols-2 gap-6">
                {filteredPosts.slice(1).map(post => (
                  <article
                    key={post.id}
                    onClick={() => onNavigate(`blog/${post.slug}`)}
                    className="group cursor-pointer bg-white rounded-2xl shadow-sm border border-border overflow-hidden hover:shadow-lg transition-all duration-300"
                  >
                    {post.cover_image_url && (
                      <div className="aspect-[16/9] overflow-hidden">
                        <img
                          src={post.cover_image_url}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${CATEGORY_COLORS[post.category]}`}>
                          {CATEGORY_LABELS[post.category]}
                        </span>
                        <span className="text-[11px] text-muted">
                          {formatDate(post.published_at || post.created_at)}
                        </span>
                      </div>
                      <h3 className="font-bold text-ink group-hover:text-coral transition-colors mb-1 line-clamp-2">
                        {post.title}
                      </h3>
                      <p className="text-muted text-sm line-clamp-2">{post.excerpt}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Blog;
