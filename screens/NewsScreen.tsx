import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getMentalHealthNews } from '../services/geminiService';
import { RefreshCwIcon, LinkIcon, X, SendIcon, Globe } from '../components/ui/Icons';
import { Badge } from '../components/ui/Shadcn';
import { playSound } from '../services/soundService';

// --- Types ---
interface NewsItem {
    title: string;
    summary: string;
    full_content: string;
    tag: string;
    image_description?: string;
    source_url?: string;
}

const CATEGORIES = [
    { id: 'all', label: 'Geral', query: undefined },
    { id: 'mental_health', label: 'Saúde Mental', query: 'saúde mental, ansiedade e bem-estar emocional' },
    { id: 'neuroscience', label: 'Neurociência', query: 'neurociência, cérebro, memória e aprendizado' },
    { id: 'psychology', label: 'Psicologia', query: 'psicologia positiva, relacionamentos e terapia' },
    { id: 'wellness', label: 'Bem-estar', query: 'mindfulness, sono, hábitos saudáveis e relaxamento' }
];

// --- Helper: Generate Deterministic Gradient ---
const generateGradient = (str: string) => {
    const hash = str.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
    const hue1 = Math.abs(hash % 360);
    const hue2 = (hue1 + 40) % 360;
    return `linear-gradient(135deg, hsl(${hue1}, 70%, 85%), hsl(${hue2}, 70%, 90%))`;
};

// --- UI Components ---

const NewsCardSkeleton = () => (
    <div className="flex flex-col gap-2 animate-pulse">
        <div className="bg-gray-100 rounded-lg aspect-video mb-2 w-full"></div>
        <div className="h-6 bg-gray-100 rounded w-3/4 mb-1"></div>
        <div className="h-4 bg-gray-100 rounded w-full"></div>
        <div className="h-4 bg-gray-100 rounded w-2/3"></div>
    </div>
);

// Component to handle AI Generated Image based on description
const NewsImage: React.FC<{ description?: string; title: string; className?: string }> = ({ description, title, className }) => {
    const [imageStatus, setImageStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
    
    // Use Pollinations.ai for dynamic image generation based on the prompt
    // We add 'model=flux' for higher quality generations
    const imageUrl = description 
        ? `https://image.pollinations.ai/prompt/${encodeURIComponent(description)}?width=800&height=450&nologo=true&model=flux&seed=${Math.floor(Math.random() * 1000)}`
        : null;

    return (
        <div className={`relative overflow-hidden w-full h-full ${className}`} style={{ background: imageStatus !== 'loaded' ? generateGradient(title) : 'transparent' }}>
            {imageUrl && imageStatus !== 'error' && (
                <img 
                    src={imageUrl} 
                    alt={title}
                    className={`w-full h-full object-cover transition-opacity duration-700 ${imageStatus === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={() => setImageStatus('loaded')}
                    onError={() => setImageStatus('error')}
                    loading="lazy"
                />
            )}
            {imageStatus === 'loading' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                    <span className="text-4xl opacity-50 animate-pulse">✨</span>
                </div>
            )}
            {imageStatus === 'error' && (
                <div className="absolute inset-0 flex items-center justify-center">
                     <span className="text-4xl opacity-30">📰</span>
                </div>
            )}
        </div>
    );
};

const NewsDetailModal: React.FC<{ item: NewsItem; onClose: () => void; fallbackSources: { title: string; uri: string }[] }> = ({ item, onClose, fallbackSources }) => {
    const handleShare = async () => {
        playSound('select');
        if (navigator.share) {
            try {
                await navigator.share({
                    title: item.title,
                    text: item.summary,
                    url: item.source_url || window.location.href,
                });
            } catch (error) { console.log('Error sharing', error); }
        } else {
            alert("URL copiada para a área de transferência!");
            navigator.clipboard.writeText(`${item.title}\n${item.source_url || ''}`);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="h-48 md:h-64 w-full shrink-0 relative">
                     <NewsImage 
                        description={item.image_description} 
                        title={item.title} 
                        className="w-full h-full"
                     />
                    <button onClick={onClose} className="absolute top-4 right-4 bg-white/30 hover:bg-white/50 text-gray-800 rounded-full p-2 transition-colors backdrop-blur-md z-10">
                        <X className="w-6 h-6" />
                    </button>
                    <Badge className="absolute bottom-4 left-6 bg-white/90 text-gray-800 shadow-sm px-3 py-1 text-sm z-10">
                        {item.tag}
                    </Badge>
                </div>

                <div className="p-6 md:p-8 flex-1">
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4 leading-tight">{item.title}</h2>
                    <div className="prose prose-blue max-w-none mb-8 text-gray-600 text-lg leading-relaxed whitespace-pre-wrap">
                        {item.full_content || item.summary}
                    </div>

                    <div className="flex flex-wrap gap-3 mt-auto pt-6 border-t border-gray-100">
                        {item.source_url && (
                            <a 
                                href={item.source_url} target="_blank" rel="noopener noreferrer"
                                className="flex-1 min-w-[140px] flex items-center justify-center gap-2 bg-[#38b6ff] text-white py-3 px-4 rounded-xl font-semibold hover:bg-blue-500 transition-colors shadow-md hover:shadow-lg"
                                onClick={() => playSound('select')}
                            >
                                <Globe className="w-5 h-5" /> Ler Fonte Oficial
                            </a>
                        )}
                        <button 
                            onClick={handleShare}
                            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                        >
                            <SendIcon className="w-5 h-5" /> Compartilhar
                        </button>
                    </div>

                    {(!item.source_url && fallbackSources.length > 0) && (
                        <div className="mt-8 bg-gray-50 rounded-xl p-4">
                            <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 tracking-wider">Fontes Relacionadas</h4>
                            <div className="space-y-2">
                                {fallbackSources.slice(0, 3).map((source, idx) => (
                                    <a key={idx} href={source.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#38b6ff] transition-colors truncate">
                                        <LinkIcon className="w-3 h-3 shrink-0" /> <span className="truncate">{source.title}</span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Main Screen ---

const BATCH_SIZE = 5; // Load 5 items at a time

const NewsScreen: React.FC = () => {
    const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
    const [sources, setSources] = useState<{ title: string, uri: string }[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedItem, setSelectedItem] = useState<NewsItem | null>(null);
    
    // Pagination State
    const [hasMore, setHasMore] = useState(true);
    const observerTarget = useRef<HTMLDivElement>(null);
    
    // Ref to keep track of items for the async fetch callback without dependency loops
    const newsItemsRef = useRef<NewsItem[]>([]);

    // Cache structure: { [categoryId]: { items: NewsItem[], sources: any[], timestamp: number } }
    const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

    useEffect(() => {
        newsItemsRef.current = newsItems;
    }, [newsItems]);

    const fetchNews = useCallback(async (categoryId: string, reset = false) => {
        if (reset) {
            setIsLoading(true);
            setHasMore(true);
        } else {
            setIsLoadingMore(true);
        }

        const category = CATEGORIES.find(c => c.id === categoryId);
        const cacheKey = `news_cache_${categoryId}`;
        
        // Only use cache on initial load (reset=true), not when scrolling for more
        if (reset) {
            const cached = sessionStorage.getItem(cacheKey);
            if (cached) {
                const parsedCache = JSON.parse(cached);
                if (Date.now() - parsedCache.timestamp < CACHE_DURATION) {
                    setNewsItems(parsedCache.items);
                    setSources(parsedCache.sources);
                    setIsLoading(false);
                    return;
                }
            }
            setNewsItems([]);
        }
        
        try {
            // Exclude titles already present to avoid duplicates in lazy loading
            // We use the ref to get the latest state inside the callback
            const excludeTitles = reset ? [] : newsItemsRef.current.map(item => item.title);

            // Pass BATCH_SIZE to control how many items are fetched per request
            // Pass excludeTitles to ensure fresh content
            const response = await getMentalHealthNews(category?.query, BATCH_SIZE, excludeTitles);
            
            let jsonText = response.text?.trim() || "";
            if (jsonText.includes("```json")) {
                jsonText = jsonText.split("```json")[1].split("```")[0].trim();
            } else if (jsonText.startsWith("```")) {
                jsonText = jsonText.split("```")[1].trim();
            }

            let parsedItems: NewsItem[] = [];
            try {
                parsedItems = JSON.parse(jsonText);
            } catch (e) {
                const start = jsonText.indexOf('[');
                const end = jsonText.lastIndexOf(']');
                if (start !== -1 && end !== -1) {
                     parsedItems = JSON.parse(jsonText.substring(start, end + 1));
                }
            }

            if (Array.isArray(parsedItems) && parsedItems.length > 0) {
                const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
                const extractedSources = groundingChunks
                    ? groundingChunks.map((chunk: any) => chunk.web).filter((web: any) => web && web.uri && web.title)
                    : [];

                setNewsItems(prev => {
                    // Deduplicate based on title (double check)
                    const currentTitlesSet = new Set(reset ? [] : prev.map(i => i.title));
                    const newUniqueItems = parsedItems.filter(i => !currentTitlesSet.has(i.title));
                    
                    const updatedList = reset ? parsedItems : [...prev, ...newUniqueItems];
                    
                    // Update Cache with the full list if resetting or first load
                    sessionStorage.setItem(cacheKey, JSON.stringify({
                        items: updatedList,
                        sources: reset ? extractedSources : [...sources, ...extractedSources],
                        timestamp: Date.now()
                    }));
                    
                    return updatedList;
                });

                if (reset) {
                    setSources(extractedSources);
                } else {
                    setSources(prev => [...prev, ...extractedSources]);
                }
                
                // If we got fewer items than requested, assume end of list
                if (parsedItems.length < BATCH_SIZE) {
                    setHasMore(false);
                }

            } else {
                if (reset) setNewsItems([]);
                setHasMore(false); 
            }
        } catch (error) {
            console.error("Error fetching news:", error);
            if (reset) setHasMore(false);
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    }, [sources]); // Removed newsItems dependency to avoid loops, using ref instead

    // Initial Load
    useEffect(() => {
        fetchNews(selectedCategory, true);
    }, [selectedCategory, fetchNews]);

    // Infinite Scroll Observer
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasMore && !isLoading && !isLoadingMore) {
                    fetchNews(selectedCategory, false);
                }
            },
            { threshold: 0.5 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => {
            if (observerTarget.current) {
                observer.unobserve(observerTarget.current);
            }
        };
    }, [hasMore, isLoading, isLoadingMore, selectedCategory, fetchNews]);

    const handleRefresh = () => {
        playSound('select');
        // Clear cache to force fresh content
        sessionStorage.removeItem(`news_cache_${selectedCategory}`);
        fetchNews(selectedCategory, true);
    };

    const handleCategorySelect = (categoryId: string) => {
        if (categoryId === selectedCategory) return;
        playSound('select');
        setSelectedCategory(categoryId);
    };

    return (
        <div className="bg-white h-full overflow-y-auto pb-28">
            {selectedItem && (
                <NewsDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} fallbackSources={sources} />
            )}

            <div className="container mx-auto px-4 py-8 md:py-12">
                {/* Header */}
                <div className="flex flex-col gap-6 mb-10">
                    <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="px-3 py-1 text-sm font-medium bg-blue-50 text-blue-600">
                            Feed Inteligente
                        </Badge>
                        <button
                            onClick={handleRefresh}
                            disabled={isLoading}
                            className={`p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-[#38b6ff] transition-all ${isLoading ? 'animate-spin' : ''}`}
                            title="Atualizar Notícias"
                        >
                            <RefreshCwIcon className="w-5 h-5" />
                        </button>
                    </div>
                    
                    <div>
                        <h2 className="text-3xl md:text-5xl font-bold text-gray-900 tracking-tight mb-2">
                            Novidades <span className="text-[#ffde59]">+</span>
                        </h2>
                        <p className="text-lg text-gray-500 max-w-xl leading-relaxed">
                            Ciência, descobertas e boas notícias para nutrir sua mente.
                        </p>
                    </div>

                    {/* Category Filter */}
                    <div className="flex flex-wrap gap-2">
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => handleCategorySelect(cat.id)}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${
                                    selectedCategory === cat.id
                                        ? 'bg-[#38b6ff] text-white border-[#38b6ff] shadow-md scale-105'
                                        : 'bg-white text-gray-600 border-gray-200 hover:border-[#38b6ff] hover:text-[#38b6ff]'
                                }`}
                                disabled={isLoading && selectedCategory !== cat.id}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                    {/* Items */}
                    {newsItems.map((item, index) => (
                        <div 
                            key={`${item.title}-${index}`}
                            className="flex flex-col gap-3 group cursor-pointer bg-white animate-fade-in"
                            onClick={() => { playSound('select'); setSelectedItem(item); }}
                        >
                            <div className="rounded-xl aspect-video w-full overflow-hidden relative shadow-sm transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1">
                                <NewsImage 
                                    description={item.image_description} 
                                    title={item.title} 
                                />
                                
                                <div className="absolute top-3 left-3">
                                    <Badge className="bg-white/90 text-gray-800 backdrop-blur-md shadow-sm">
                                        {item.tag}
                                    </Badge>
                                </div>
                            </div>
                            
                            <div className="flex flex-col gap-1">
                                <h3 className="text-xl font-bold leading-tight text-gray-900 group-hover:text-[#38b6ff] transition-colors">
                                    {item.title}
                                </h3>
                                <p className="text-gray-500 text-base line-clamp-3 leading-relaxed">
                                    {item.summary}
                                </p>
                            </div>
                        </div>
                    ))}

                    {/* Initial Loading Skeletons */}
                    {isLoading && (
                        Array.from({ length: BATCH_SIZE }).map((_, i) => <NewsCardSkeleton key={`skel-${i}`} />)
                    )}
                </div>

                {/* Load More Sentinel & Spinner */}
                <div ref={observerTarget} className="w-full py-8 flex justify-center items-center">
                    {isLoadingMore && (
                        <div className="flex items-center gap-2 text-gray-400 animate-pulse">
                            <div className="w-2 h-2 bg-[#38b6ff] rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-[#38b6ff] rounded-full animate-bounce delay-100"></div>
                            <div className="w-2 h-2 bg-[#38b6ff] rounded-full animate-bounce delay-200"></div>
                            <span className="text-sm font-medium">Carregando <span className="text-[#ffde59]">+</span> novidades...</span>
                        </div>
                    )}
                    {!hasMore && newsItems.length > 0 && !isLoading && (
                        <p className="text-gray-400 text-sm">Você chegou ao fim das novidades por enquanto.</p>
                    )}
                    {!isLoading && newsItems.length === 0 && !hasMore && (
                         <div className="text-center py-10 text-gray-400 w-full">
                            <p className="text-lg">Nenhuma notícia encontrada.</p>
                            <button onClick={handleRefresh} className="mt-4 text-[#38b6ff] font-medium hover:underline">Tentar novamente</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NewsScreen;