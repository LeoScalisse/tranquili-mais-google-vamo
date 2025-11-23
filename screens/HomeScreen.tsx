import React, { useState, useEffect } from 'react';
import { UserProfile, Screen, Mood, MoodEntry } from '../types';
import { MOOD_OPTIONS, MOOD_EMOJIS, MOOD_HEX_COLORS } from '../constants';
import { playSound } from '../services/soundService';
import { getWellnessTip, WellnessTipData } from '../services/geminiService';
import { MenuIcon, RefreshCwIcon, HeartIcon, SendIcon } from '../components/ui/Icons';
import InstallPromptModal from '../components/InstallPromptModal';

interface HomeScreenProps {
  userProfile: UserProfile;
  moodHistory: MoodEntry[];
  onMoodSelect: (mood: Mood) => void;
  navigateTo: (screen: Screen) => void;
  handleProtectedAction: (action: () => void) => void;
  onOpenSideMenu: () => void;
}

// Constants for Refresh Logic
const MAX_REFRESHES_PER_DAY = 5;
const REFRESH_STORAGE_KEY = 'wellness_tip_refresh';

interface WellnessTipCardProps { 
    tipData: WellnessTipData | null;
    isLoading: boolean;
    onRefresh: () => void;
    refreshCount: number;
    maxRefreshes: number;
}

const WellnessTipCard: React.FC<WellnessTipCardProps> = ({ tipData, isLoading, onRefresh, refreshCount, maxRefreshes }) => {
  return (
    <div className="bg-white/80 backdrop-blur-lg p-5 rounded-xl shadow-md mb-6 relative overflow-hidden border border-white/40">
      {isLoading ? (
        // Skeleton Loader - Estrutura refinada para simular o conteúdo real
        <div className="animate-pulse flex items-start">
           {/* Ícone Placeholder */}
           <div className="w-8 h-8 rounded-full bg-gray-200 mr-4 flex-shrink-0"></div>
           
           <div className="flex-1 space-y-4">
             {/* Header: Título e Contador */}
             <div className="flex justify-between items-center">
                <div className="h-3 bg-gray-200 rounded w-24"></div> {/* "Dica do Dia" */}
                <div className="h-3 bg-gray-200 rounded w-8"></div>  {/* Contador */}
             </div>

             {/* Corpo do Texto */}
             <div className="space-y-2 py-1">
                <div className="h-3 bg-gray-200 rounded w-full"></div>
                <div className="h-3 bg-gray-200 rounded w-11/12"></div>
                <div className="h-3 bg-gray-200 rounded w-4/5"></div>
             </div>

             {/* Rodapé: Autor (opcional visualmente) */}
             <div className="flex justify-end pt-1">
                <div className="h-2 bg-gray-200 rounded w-16"></div>
             </div>
           </div>
        </div>
      ) : (
        <div className="flex items-start">
           <span className="text-2xl mr-4 mt-1 filter drop-shadow-sm">💡</span>
           <div className="flex-1">
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-sm text-gray-700 uppercase tracking-wide opacity-80 mb-1">
                    {tipData?.author ? 'Inspiração do Dia' : 'Dica do Dia'}
                </h3>
                {/* Refresh Button */}
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium text-gray-400">
                        {refreshCount}/{maxRefreshes}
                    </span>
                    <button 
                        onClick={onRefresh}
                        disabled={refreshCount >= maxRefreshes}
                        className={`p-1.5 rounded-full transition-all duration-300 ${
                            refreshCount >= maxRefreshes 
                            ? 'text-gray-300 cursor-not-allowed' 
                            : 'text-[#38b6ff] hover:bg-blue-50 hover:rotate-180'
                        }`}
                        title="Nova dica"
                    >
                        <RefreshCwIcon className="w-4 h-4" />
                    </button>
                </div>
              </div>
              
              <p className={`text-gray-800 text-base leading-relaxed ${tipData?.author ? 'italic font-serif' : ''}`}>
                "{tipData?.text}"
              </p>
              
              <p className="text-right text-xs font-semibold text-gray-500 mt-2 border-t border-gray-200 pt-2 inline-block float-right">
                  — {tipData?.author || "Tranquili+"}
              </p>
           </div>
        </div>
      )}
    </div>
  );
};

const GratitudeJournal: React.FC = () => {
  const [entry, setEntry] = useState('');
  const [savedToday, setSavedToday] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const stored = localStorage.getItem('daily_gratitude');
    if (stored) {
      const data = JSON.parse(stored);
      if (data.date === today) {
        setSavedToday(data.text);
      }
    }
  }, []);

  const handleSave = () => {
    if (!entry.trim()) return;
    playSound('confirm');
    const today = new Date().toISOString().split('T')[0];
    const data = { date: today, text: entry };
    localStorage.setItem('daily_gratitude', JSON.stringify(data));
    setSavedToday(entry);
    setIsEditing(false);
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-yellow-300 relative overflow-hidden group transition-all hover:-translate-y-1">
      <div className="absolute top-0 right-0 p-4 opacity-10">
         <HeartIcon className="w-16 h-16 text-yellow-500 transform rotate-12" />
      </div>

      <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
        <HeartIcon className="w-5 h-5 text-yellow-500 fill-current" />
        Diário da Gratidão
      </h3>

      {!savedToday || isEditing ? (
        <div className="mt-3 relative z-10">
          <p className="text-sm text-gray-500 mb-3">Pelo que você é grato hoje?</p>
          <div className="relative">
            <textarea
              value={entry}
              onChange={(e) => setEntry(e.target.value)}
              placeholder="Hoje eu sou grato por..."
              className="w-full p-3 pr-12 bg-gray-50 rounded-xl border border-gray-200 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 outline-none resize-none text-gray-700 h-24 transition-all"
            />
            <button 
              onClick={handleSave}
              disabled={!entry.trim()}
              className="absolute bottom-3 right-3 p-2 bg-yellow-400 text-white rounded-full hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
            >
              <SendIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 relative z-10 animate-fade-in">
          <p className="text-sm text-gray-400 mb-1">Hoje você agradeceu por:</p>
          <p className="text-lg text-gray-700 font-medium italic leading-relaxed">"{savedToday}"</p>
          <button 
            onClick={() => { setEntry(savedToday); setIsEditing(true); playSound('select'); }}
            className="text-xs text-yellow-600 mt-3 hover:underline font-medium"
          >
            Editar gratidão
          </button>
        </div>
      )}
    </div>
  );
};

const HomeScreen: React.FC<HomeScreenProps> = ({ userProfile, moodHistory, onMoodSelect, navigateTo, handleProtectedAction, onOpenSideMenu }) => {
  const [greeting, setGreeting] = useState('');
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [explodingMood, setExplodingMood] = useState<Mood | null>(null);
  
  // Tip State
  const [wellnessTip, setWellnessTip] = useState<WellnessTipData | null>(null);
  const [isTipLoading, setIsTipLoading] = useState(true);
  const [dailyRefreshCount, setDailyRefreshCount] = useState(0);
  
  const GREETINGS = [
    `Bem-vindo, ${userProfile.name}. Respira.`,
    `Oi, ${userProfile.name}. Um novo dia começa.`,
    `Boa noite, ${userProfile.name}. Descanse aqui.`,
    `Que bom te ver, ${userProfile.name}.`,
    `Olá, ${userProfile.name}. Hoje é seu.`,
    `Sua mente sorriu, ${userProfile.name}.`,
    `Você voltou, ${userProfile.name}.`,
    `Respira fundo, ${userProfile.name}.`,
    `Novo capítulo, ${userProfile.name}.`,
    `Sua calma importa, ${userProfile.name}.`,
    `Esse momento é seu, ${userProfile.name}.`,
    `Tranquili+ te acolhe, ${userProfile.name}.`,
    `Um instante de paz, ${userProfile.name}.`,
    `Escute sua mente, ${userProfile.name}.`,
    `Boa jornada, ${userProfile.name}.`
  ];

  const today = new Date().toISOString().split('T')[0];
  const hasLoggedMoodToday = moodHistory.some(entry => entry.date === today);

  // --- Refresh Logic Helper ---
  const getRefreshStatus = () => {
    const stored = localStorage.getItem(REFRESH_STORAGE_KEY);
    if (stored) {
        const { date, count } = JSON.parse(stored);
        if (date === today) {
            return count;
        }
    }
    return 0;
  };

  const updateRefreshStatus = (newCount: number) => {
      localStorage.setItem(REFRESH_STORAGE_KEY, JSON.stringify({ date: today, count: newCount }));
      setDailyRefreshCount(newCount);
  };

  const fetchTip = async (isRefresh = false) => {
    setIsTipLoading(true);
    try {
      const cachedTipString = sessionStorage.getItem('wellnessTipData');
      
      // Use cache if available and NOT a forced refresh
      if (cachedTipString && !isRefresh) {
        setWellnessTip(JSON.parse(cachedTipString));
        setIsTipLoading(false);
        return;
      }

      // Fetch new
      const tip = await getWellnessTip();
      setWellnessTip(tip);
      sessionStorage.setItem('wellnessTipData', JSON.stringify(tip));
      
      if (isRefresh) {
         const current = getRefreshStatus();
         updateRefreshStatus(current + 1);
      }
    } catch (error) {
      console.error("Failed to fetch wellness tip:", error);
      setWellnessTip({ text: "Lembre-se de respirar fundo e apreciar o momento presente." });
    } finally {
      setIsTipLoading(false);
    }
  };

  const handleRefreshTip = () => {
      const currentCount = getRefreshStatus();
      if (currentCount < MAX_REFRESHES_PER_DAY) {
          playSound('select');
          fetchTip(true);
      } else {
          playSound('error'); // Limit reached
      }
  };

  useEffect(() => {
    // Greeting Logic
    const randomGreeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
    setGreeting(randomGreeting);
    
    // Init Refresh Count
    setDailyRefreshCount(getRefreshStatus());

    // Initial Tip Fetch
    fetchTip(false);
  }, []); // Empty dependency array ensures this runs only once on mount.

  const handleMoodSelection = (mood: Mood) => {
    handleProtectedAction(() => {
        if (selectedMood) return; // Prevent clicking another mood during animation
        playSound('select');
        setSelectedMood(mood);
        setExplodingMood(mood); // Trigger explosion
        setTimeout(() => {
          onMoodSelect(mood);
        }, 400); // Allow animation to be visible
        // Reset explosion after animation finishes
        setTimeout(() => {
            setExplodingMood(null);
        }, 600);
    });
  };

  const MoodSelector: React.FC = () => (
    <div className="bg-white p-4 rounded-xl shadow-md">
      <h2 className="text-lg font-semibold text-gray-700 mb-3 text-center">Como você está se sentindo hoje?</h2>
      <div className="flex justify-around">
        {MOOD_OPTIONS.map((mood) => (
          <button 
            key={mood} 
            onClick={() => handleMoodSelection(mood)}
            disabled={!!selectedMood}
            className={`flex flex-col items-center space-y-1 transition-transform duration-300 ease-in-out transform ${
              selectedMood === mood ? 'scale-125' : 'hover:scale-110'
            }`}
          >
            <div className={`explosion-container ${explodingMood === mood ? 'exploding' : ''}`}>
              <span className="text-4xl">{MOOD_EMOJIS[mood]}</span>
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="particle"
                  style={{ backgroundColor: MOOD_HEX_COLORS[mood] }}
                />
              ))}
            </div>
            <span className="text-xs capitalize text-gray-500">{mood}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const TodayMood: React.FC = () => {
      const todayMood = moodHistory.find(entry => entry.date === today)?.mood;
      if (!todayMood) return null;
      return (
        <div className="bg-white p-4 rounded-xl shadow-md text-center">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">Seu humor de hoje:</h2>
            <p className="text-5xl">{MOOD_EMOJIS[todayMood]}</p>
        </div>
      );
  };
  
  const FeatureCard: React.FC<{title: string, description: string, color: string, onClick: () => void}> = ({ title, description, color, onClick }) => (
    <div 
      onClick={() => handleProtectedAction(() => { playSound('navigation'); onClick(); })}
      className={`${color} p-6 rounded-2xl shadow-lg cursor-pointer transition-transform transform hover:-translate-y-1 relative overflow-hidden`}
    >
      <h3 className="text-xl font-bold text-white relative z-10">{title}</h3>
      <p className="text-white opacity-90 mt-1 relative z-10">{description}</p>
    </div>
  );

  const renderGreeting = (text: string) => {
    if (!text.includes('Tranquili+')) return text;
    const parts = text.split('Tranquili+');
    return (
        <>
            {parts.map((part, index) => (
                <React.Fragment key={index}>
                    {part}
                    {index < parts.length - 1 && (
                        <span>Tranquili<span className="text-[#ffde59]">+</span></span>
                    )}
                </React.Fragment>
            ))}
        </>
    );
  };

  return (
    <div className="p-4 pb-28 bg-gray-50 h-full overflow-y-auto">
      <InstallPromptModal />
      <header className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight leading-tight">{renderGreeting(greeting)}</h1>
          <p className="text-gray-500 text-sm mt-1 font-medium">Reserve um instante para notar a beleza de ser e sentir o seu redor...</p>
        </div>
        <button
            onClick={() => { playSound('toggle'); onOpenSideMenu(); }}
            className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors flex-shrink-0"
            aria-label="Abrir menu"
        >
            <MenuIcon className="w-7 h-7" />
        </button>
      </header>

      <WellnessTipCard 
          tipData={wellnessTip} 
          isLoading={isTipLoading} 
          onRefresh={handleRefreshTip}
          refreshCount={dailyRefreshCount}
          maxRefreshes={MAX_REFRESHES_PER_DAY}
      />

      <div className="mb-6">
        {hasLoggedMoodToday ? <TodayMood /> : <MoodSelector />}
      </div>
      
      <div className="space-y-4">
        <FeatureCard 
          title="Tranquilinha"
          description="Converse com nossa IA para apoio e dicas."
          color="bg-[#38b6ff]"
          onClick={() => navigateTo(Screen.Chat)}
        />
        <FeatureCard 
          title="Games Mentais"
          description="Desafie sua mente com jogos divertidos."
          color="bg-[#ffde59]"
          onClick={() => navigateTo(Screen.Games)}
        />
        <FeatureCard 
          title="Sua Evolução"
          description="Veja seu progresso e suas conquistas."
          color="bg-pink-300"
          onClick={() => navigateTo(Screen.Reports)}
        />
        
        {/* New Section */}
        <FeatureCard 
          title="Novidades"
          description="Descubra notícias e estudos sobre bem-estar."
          color="bg-emerald-400"
          onClick={() => navigateTo(Screen.News)}
        />

        <GratitudeJournal />
      </div>
    </div>
  );
};

export default HomeScreen;