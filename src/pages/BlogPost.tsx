import React, { useState, useEffect } from 'react';
import { ChevronRight, Calendar, Tag, Clock, Share2, Loader2 } from 'lucide-react';
import { supabase } from '../supabase';
import { BlogPost as BlogPostType, BlogCategory } from '../types';
import { Helmet } from 'react-helmet-async';

const CATEGORY_LABELS: Record<BlogCategory, string> = {
  noticias: 'Notícias', turismo: 'Turismo', eventos: 'Eventos',
  gastronomia: 'Gastronomia', historia: 'História', dicas: 'Dicas',
};

const CATEGORY_COLORS: Record<BlogCategory, string> = {
  noticias: 'bg-blue-100 text-blue-700', turismo: 'bg-emerald-100 text-emerald-700',
  eventos: 'bg-purple-100 text-purple-700', gastronomia: 'bg-amber-100 text-amber-700',
  historia: 'bg-rose-100 text-rose-700', dicas: 'bg-cyan-100 text-cyan-700',
};

interface BlogPostPageProps {
  slug: string;
  onNavigate: (view: string) => void;
  onBack: () => void;
}

/** Simple inline Markdown → HTML renderer (handles ##, **, -, links) */
function renderMarkdown(md: string): string {
  return md
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold text-ink mt-6 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-ink mt-8 mb-3">$1</h2>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-coral underline hover:text-coral/80" target="_blank" rel="noopener noreferrer">$1</a>')
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-muted">$1</li>')
    // Paragraphs (double newline)
    .replace(/\n\n/g, '</p><p class="text-muted leading-relaxed mb-4">')
    // Single line breaks
    .replace(/\n/g, '<br/>');
}

const BlogPostPage: React.FC<BlogPostPageProps> = ({ slug, onNavigate, onBack }) => {
  const [post, setPost] = useState<BlogPostType | null>(null);
  const [loading, setLoading] = useState(true);
  const [relatedPosts, setRelatedPosts] = useState<BlogPostType[]>([]);

  useEffect(() => {
    fetchPost();
  }, [slug]);

  const fetchPost = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();

    if (!error && data) {
      setPost(data as BlogPostType);
      // Fetch related posts
      const { data: related } = await supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, cover_image_url, category, published_at, created_at')
        .eq('status', 'published')
        .eq('category', data.category)
        .neq('id', data.id)
        .order('published_at', { ascending: false })
        .limit(3);
      if (related) setRelatedPosts(related as BlogPostType[]);
    }
    setLoading(false);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  const estimateReadTime = (content: string) => {
    const words = content.split(/\s+/).length;
    return Math.max(1, Math.ceil(words / 200));
  };

  const handleShare = async () => {
    const url = window.location.origin + `/#blog/${slug}`;
    if (navigator.share) {
      await navigator.share({ title: post?.title, text: post?.excerpt, url });
    } else {
      await navigator.clipboard.writeText(url);
      alert('Link copiado!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-coral" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-4">
        <p className="text-lg text-muted">Artigo não encontrado.</p>
        <button onClick={() => onNavigate('blog')} className="text-coral font-semibold hover:underline">
          Ir para o Blog
        </button>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{post.title} — Blog Go Paraty</title>
        <meta name="description" content={post.meta_description || post.excerpt || ''} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.meta_description || post.excerpt || ''} />
        {post.cover_image_url && <meta property="og:image" content={post.cover_image_url} />}
      </Helmet>

      <div className="min-h-screen bg-surface">
        {/* Back nav */}
        <div className="max-w-3xl mx-auto px-4 pt-6">
          <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted hover:text-ink transition-colors">
            <ChevronRight className="w-4 h-4 rotate-180" /> Voltar ao Blog
          </button>
        </div>

        {/* Cover image */}
        {post.cover_image_url && (
          <div className="max-w-4xl mx-auto px-4 mt-4">
            <div className="aspect-[2/1] rounded-2xl overflow-hidden shadow-lg">
              <img src={post.cover_image_url} alt={post.title} className="w-full h-full object-cover" />
            </div>
          </div>
        )}

        {/* Article */}
        <article className="max-w-3xl mx-auto px-4 py-8">
          {/* Meta */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${CATEGORY_COLORS[post.category]}`}>
              {CATEGORY_LABELS[post.category]}
            </span>
            {post.ai_generated && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-600">✦ Gerado por IA</span>
            )}
            <span className="text-xs text-muted flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(post.published_at || post.created_at)}
            </span>
            <span className="text-xs text-muted flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {estimateReadTime(post.content)} min de leitura
            </span>
            <button onClick={handleShare} className="ml-auto text-muted hover:text-coral transition-colors">
              <Share2 className="w-4 h-4" />
            </button>
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-black text-ink mb-4 leading-tight">
            {post.title}
          </h1>

          {post.excerpt && (
            <p className="text-lg text-muted mb-8 border-l-4 border-coral pl-4 italic">
              {post.excerpt}
            </p>
          )}

          {/* Content */}
          <div
            className="prose prose-sm max-w-none text-muted leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: `<p class="text-muted leading-relaxed mb-4">${renderMarkdown(post.content)}</p>`
            }}
          />

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="mt-8 pt-6 border-t border-border flex items-center gap-2 flex-wrap">
              <Tag className="w-4 h-4 text-muted" />
              {post.tags.map(tag => (
                <span key={tag} className="px-2.5 py-1 bg-surface rounded-full text-xs text-muted font-medium">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Author */}
          {post.author_name && (
            <div className="mt-6 p-4 bg-surface rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-coral/10 flex items-center justify-center text-coral font-bold">
                {post.author_name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">{post.author_name}</p>
                <p className="text-xs text-muted">Autor</p>
              </div>
            </div>
          )}
        </article>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <div className="max-w-3xl mx-auto px-4 pb-12">
            <h3 className="text-lg font-bold text-ink mb-4">Artigos relacionados</h3>
            <div className="grid sm:grid-cols-3 gap-4">
              {relatedPosts.map(rp => (
                <article
                  key={rp.id}
                  onClick={() => onNavigate(`blog/${rp.slug}`)}
                  className="group cursor-pointer bg-white rounded-xl shadow-sm border border-border overflow-hidden hover:shadow-md transition-all"
                >
                  {rp.cover_image_url && (
                    <div className="aspect-[16/9] overflow-hidden">
                      <img src={rp.cover_image_url} alt={rp.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                    </div>
                  )}
                  <div className="p-3">
                    <h4 className="font-semibold text-sm text-ink group-hover:text-coral line-clamp-2">{rp.title}</h4>
                    <p className="text-[11px] text-muted mt-1">
                      {formatDate(rp.published_at || rp.created_at)}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default BlogPostPage;
