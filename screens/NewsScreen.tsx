
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getMentalHealthNews } from '../services/geminiService';
import { RefreshCwIcon, LinkIcon, X, SendIcon, Globe } from '../components/ui/Icons';
import { Badge } from '../components/ui/Shadcn';
import { playSound } from '../services/soundService';

interface NewsItem { title: string; summary: string; full_content: string; tag: string; image_description?: string; source_url?: string; }
const CATEGORIES = [
    { id: 'all', label: 'Geral', query: undefined },
    { id: 'mental_health', label: 'Saúde Mental', query: 'saúde mental' },
    { id: 'neuroscience', label: 'Neurociência', query: 'neurociência' },
    { id: 'psychology', label: 'Psicologia', query: 'psicologia positiva' }
];

const NewsImage: React.FC<{ description?: string; title: string; className?: string }> = ({ description, title, className }) => {
    const [imageStatus, setImageStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
    const imageUrl = description ? `https://image.pollinations.ai/prompt/${encodeURIComponent(description)}?width=800&height=450&nologo=true&model=flux&seed=${Math.floor(Math.random() * 1000)}` : null;
    return (
        <div className={`relative overflow-hidden w-full h-full ${className} bg-gray-100`}>
            {imageUrl && imageStatus !== 'error' && (
                <img src={imageUrl} alt={title} className={`w-full h-full object-cover transition-opacity duration-700 ${imageStatus === 'loaded' ? 'opacity-100' : 'opacity-0'}`} onLoad={() => setImageStatus('loaded')} onError={() => setImageStatus('error')} />
            )}
            {imageStatus === 'loading' && <div className="absolute inset-0 flex items-center justify-center bg-blue-50/30 animate-pulse text-2xl">✨</div>}
        </div>
    );
};

const NewsScreen: React.FC = () => {
    const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedItem, setSelectedItem] = useState<NewsItem | null>(null);

    const fetchNews = useCallback(async (catId: string) => {
        setIsLoading(true);
        try {
            const cat = CATEGORIES.find(c => c.id === catId);
            const response = await getMentalHealthNews(cat?.query, 6);
            let jsonText = response.text?.trim() || "[]";
            if (jsonText.includes("```json")) jsonText = jsonText.split("```json")[1].split("```")[0].trim();
            setNewsItems(JSON.parse(jsonText));
        } catch (e) { setNewsItems([]); } finally { setIsLoading(false); }
    }, []);

    useEffect(() => { fetchNews(selectedCategory); }, [selectedCategory, fetchNews]);

    return (
        <div className="bg-white h-full overflow-y-auto pb-28 px-4 py-8">
            {selectedItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedItem(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative" onClick={e => e.stopPropagation()}>
                        <NewsImage description={selectedItem.image_description} title={selectedItem.title} className="h-64 w-full" />
                        <button onClick={() => setSelectedItem(null)} className="absolute top-4 right-4 bg-white/50 rounded-full p-2"><X className="w-6 h-6"/></button>
                        <div className="p-6">
                            <Badge className="mb-4">{selectedItem.tag}</Badge>
                            <h2 className="text-2xl font-bold mb-4 text-gray-900">{selectedItem.title}</h2>
                            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{selectedItem.full_content || selectedItem.summary}</p>
                            {selectedItem.source_url && <a href={selectedItem.source_url} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 text-[#38b6ff] font-bold hover:underline"><Globe className="w-5 h-5"/> Ler notícia completa</a>}
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-end mb-8">
                <div>
                    <Badge variant="secondary" className="mb-2 bg-blue-50 text-[#38b6ff] border-blue-100">Curadoria Digital</Badge>
                    <h1 className="text-3xl font-bold text-gray-900">Novidades <span className="text-[#ffde59] font-black">+</span></h1>
                </div>
                <button onClick={() => fetchNews(selectedCategory)} className="p-2.5 bg-gray-50 border border-gray-100 rounded-full text-[#38b6ff] hover:bg-gray-100 transition-colors shadow-sm"><RefreshCwIcon className="w-6 h-6"/></button>
            </div>

            <div className="flex gap-2 mb-8 overflow-x-auto pb-2 no-scrollbar">
                {CATEGORIES.map(c => (
                    <button key={c.id} onClick={() => setSelectedCategory(c.id)} className={`px-5 py-2 rounded-full whitespace-nowrap text-sm font-bold border transition-all ${selectedCategory === c.id ? 'bg-[#38b6ff] text-white border-[#38b6ff] shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:border-blue-200'}`}>{c.label}</button>
                ))}
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-center animate-pulse">
                    <div className="w-16 h-16 border-4 border-[#38b6ff] border-t-[#ffde59] rounded-full animate-spin mb-6"></div>
                    <p className="text-xl font-bold text-gray-800">Encontrando notícias fresquinhas para você...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {newsItems.map((item, i) => (
                        <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer hover:shadow-lg transition-all group" onClick={() => { playSound('select'); setSelectedItem(item); }}>
                            <NewsImage description={item.image_description} title={item.title} className="h-48" />
                            <div className="p-4">
                                <Badge variant="secondary" className="mb-2 bg-gray-50 text-gray-600 text-[10px] uppercase tracking-wider">{item.tag}</Badge>
                                <h3 className="font-bold text-gray-800 group-hover:text-[#38b6ff] transition-colors leading-snug">{item.title}</h3>
                                <p className="text-sm text-gray-500 mt-2 line-clamp-2">{item.summary}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
export default NewsScreen;
