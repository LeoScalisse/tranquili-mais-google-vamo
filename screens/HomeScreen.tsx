import React, { useState, useEffect } from 'react';
import { UserProfile, Screen, Mood, MoodEntry } from '../types';
import { MOOD_OPTIONS, MOOD_EMOJIS, MOOD_HEX_COLORS } from '../constants';
import { playSound } from '../services/soundService';
import { getWellnessTip, WellnessTipData } from '../services/geminiService';
import { MenuIcon, RefreshCwIcon, HeartIcon, SendIcon } from '../components/ui/Icons';
import InstallPromptModal from '../components/InstallPromptModal';
import { BrandText } from '../App';

interface HomeScreenProps {
  userProfile: UserProfile;
  moodHistory: MoodEntry[];
  onMoodSelect: (mood: Mood) => void;
  navigateTo: (screen: Screen) => void;
  handleProtectedAction: (action: () => void) => void;
  onOpenSideMenu: () => void;
}

const MAX_REFRESHES_PER_DAY = 5;
const REFRESH_STORAGE_KEY = 'wellness_tip_refresh';

const WellnessTipCard: React.FC<{ tipData: WellnessTipData | null; isLoading: boolean; onRefresh: () => void; refreshCount: number; maxRefreshes: number; }> = ({ tipData, isLoading, onRefresh, refreshCount, maxRefreshes }) => {
  return (
    <div className="bg-white/80 backdrop-blur-lg p-5 rounded-xl shadow-md mb-6 relative overflow-hidden border border-white/40">
      {isLoading ? (
        <div className="animate-pulse flex items-start">
           <div className="w-8 h-8 rounded-full bg-gray-200 mr-4 flex-shrink-0"></div>
           <div className="flex-1 space-y-4">
             <div className="flex justify-between items-center">
                <div className="h-3 bg-gray-200 rounded w-24"></div>
                <div className="h-3 bg-gray-200 rounded w-8"></div>
             </div>
             <div className="space-y-2 py-1">
                <div className="h-3 bg-gray-200 rounded w-full"></div>
                <div className="h-3 bg-gray-200 rounded w-11/12"></div>
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
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium text-gray-400">{refreshCount}/{maxRefreshes}</span>
                    <button onClick={onRefresh} disabled={refreshCount >= maxRefreshes} className={`p-1.5 rounded-full transition-all duration-300 ${refreshCount >= maxRefreshes ? 'text-gray-300 cursor-not-allowed' : 'text-[#38b6ff] hover:bg-blue-50 hover:rotate-180'}`} title="Nova dica">
                        <RefreshCwIcon className="w-4 h-4" />
                    </button>
                </div>
              </div>
              <p className={`text-gray-800 text-base leading-relaxed ${tipData?.author ? 'italic font-serif' : ''}`}>
                "<BrandText text={tipData?.text || ""} />"
              </p>
              <p className="text-right text-xs font-semibold text-gray-500 mt-2 border-t border-gray-200 pt-2 inline-block float-right">
                  — <BrandText text={tipData?.author || "Tranquili+"} />
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
      if (data.date === today) setSavedToday(data.text);
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
            <textarea value={entry} onChange={(e) => setEntry(e.target.value)} placeholder="Hoje eu sou grato por..." className="w-full p-3 pr-12 bg-gray-50 rounded-xl border border-gray-200 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 outline-none resize-none text-gray-700 h-24 transition-all" />
            <button onClick={handleSave} disabled={!entry.trim()} className="absolute bottom-3 right-3 p-2 bg-yellow-400 text-white rounded-full hover:bg-yellow-500 disabled:opacity-50 shadow-sm transition-all"><SendIcon className="w-4 h-4" /></button>
          </div>
        </div>
      ) : (
        <div className="mt-3 relative z-10 animate-fade-in">
          <p className="text-sm text-gray-400 mb-1">Hoje você agradeceu por:</p>
          <p className="text-lg text-gray-700 font-medium italic leading-relaxed">"{savedToday}"</p>
          <button onClick={() => { setEntry(savedToday); setIsEditing(true); playSound('select'); }} className="text-xs text-yellow-600 mt-3 hover:underline font-medium">Editar gratidão</button>
        </div>
      )}
    </div>
  );
};

const HomeScreen: React.FC<HomeScreenProps> = ({ userProfile, moodHistory, onMoodSelect, navigateTo, handleProtectedAction, onOpenSideMenu }) => {
  const [greeting, setGreeting] = useState('');
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [explodingMood, setExplodingMood] = useState<Mood | null>(null);
  const [wellnessTip, setWellnessTip] = useState<WellnessTipData | null>(null);
  const [isTipLoading, setIsTipLoading] = useState(true);
  const [dailyRefreshCount, setDailyRefreshCount] = useState(0);
  
  const GREETINGS = [
    `Bem-vindo, ${userProfile.name}. Respira.`,
    `Oi, ${userProfile.name}. Um novo dia começa.`,
    `Boa noite, ${userProfile.name}. Descanse aqui.`,
    `Que bom te ver, ${userProfile.name}.`,
    `Sua mente sorriu, ${userProfile.name}.`,
    `Esse momento é seu, ${userProfile.name}.`,
    `Tranquili+ te acolhe, ${userProfile.name}.`,
    `Um instante de paz, ${userProfile.name}.`
  ];

  const today = new Date().toISOString().split('T')[0];
  const hasLoggedMoodToday = moodHistory.some(entry => entry.date === today);

  const updateRefreshStatus = (newCount: number) => {
      localStorage.setItem(REFRESH_STORAGE_KEY, JSON.stringify({ date: today, count: newCount }));
      setDailyRefreshCount(newCount);
  };

  const fetchTip = async (isRefresh = false) => {
    setIsTipLoading(true);
    try {
      const cachedTipString = sessionStorage.getItem('wellnessTipData');
      if (cachedTipString && !isRefresh) {
        setWellnessTip(JSON.parse(cachedTipString));
        setIsTipLoading(false);
        return;
      }
      const tip = await getWellnessTip();
      setWellnessTip(tip);
      sessionStorage.setItem('wellnessTipData', JSON.stringify(tip));
      if (isRefresh) {
         const stored = localStorage.getItem(REFRESH_STORAGE_KEY);
         const current = stored ? JSON.parse(stored).count : 0;
         updateRefreshStatus(current + 1);
      }
    } catch (error) {
      setWellnessTip({ text: "Lembre-se de respirar fundo e apreciar o momento presente." });
    } finally {
      setIsTipLoading(false);
    }
  };

  useEffect(() => {
    const randomGreeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
    setGreeting(randomGreeting);
    const stored = localStorage.getItem(REFRESH_STORAGE_KEY);
    if (stored) {
        const { date, count } = JSON.parse(stored);
        setDailyRefreshCount(date === today ? count : 0);
    }
    fetchTip(false);
  }, []);

  const handleMoodSelection = (mood: Mood) => {
    handleProtectedAction(() => {
        if (selectedMood) return;
        playSound('select');
        setSelectedMood(mood);
        setExplodingMood(mood);
        setTimeout(() => onMoodSelect(mood), 400);
        setTimeout(() => setExplodingMood(null), 600);
    });
  };

  return (
    <div className="p-4 pb-28 bg-gray-50 h-full overflow-y-auto">
      <InstallPromptModal />
      <header className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight leading-tight"><BrandText text={greeting} /></h1>
          <p className="text-gray-500 text-sm mt-1 font-medium">Reserve um instante para notar a beleza de ser e sentir o seu redor...</p>
        </div>
        <button onClick={() => { playSound('toggle'); onOpenSideMenu(); }} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors flex-shrink-0" aria-label="Abrir menu">
            <MenuIcon className="w-7 h-7" />
        </button>
      </header>

      <WellnessTipCard tipData={wellnessTip} isLoading={isTipLoading} onRefresh={() => dailyRefreshCount < MAX_REFRESHES_PER_DAY && (playSound('select'), fetchTip(true))} refreshCount={dailyRefreshCount} maxRefreshes={MAX_REFRESHES_PER_DAY} />

      <div className="mb-6">
        {hasLoggedMoodToday ? (
            <div className="bg-white p-4 rounded-xl shadow-md text-center">
                <h2 className="text-lg font-semibold text-gray-700 mb-2">Seu humor de hoje:</h2>
                <p className="text-5xl">{MOOD_EMOJIS[moodHistory.find(e => e.date === today)!.mood]}</p>
            </div>
        ) : (
            <div className="bg-white p-4 rounded-xl shadow-md">
              <h2 className="text-lg font-semibold text-gray-700 mb-3 text-center">Como você está se sentindo hoje?</h2>
              <div className="flex justify-around">
                {MOOD_OPTIONS.map((mood) => (
                  <button key={mood} onClick={() => handleMoodSelection(mood)} disabled={!!selectedMood} className={`flex flex-col items-center space-y-1 transition-transform duration-300 transform ${selectedMood === mood ? 'scale-125' : 'hover:scale-110'}`}>
                    <div className={`explosion-container ${explodingMood === mood ? 'exploding' : ''}`}>
                      <span className="text-4xl">{MOOD_EMOJIS[mood]}</span>
                      {Array.from({ length: 8 }).map((_, i) => (<div key={i} className="particle" style={{ backgroundColor: MOOD_HEX_COLORS[mood] }} />))}
                    </div>
                    <span className="text-xs capitalize text-gray-500">{mood}</span>
                  </button>
                ))}
              </div>
            </div>
        )}
      </div>
      
      <div className="space-y-4">
        <div onClick={() => handleProtectedAction(() => { playSound('navigation'); navigateTo(Screen.Chat); })} className="bg-[#38b6ff] p-6 rounded-2xl shadow-lg cursor-pointer transition-transform transform hover:-translate-y-1">
          <h3 className="text-xl font-bold text-white">Tranquilinha</h3>
          <p className="text-white opacity-90 mt-1">Converse com nossa IA para apoio e dicas.</p>
        </div>
        <div onClick={() => handleProtectedAction(() => { playSound('navigation'); navigateTo(Screen.Games); })} className="bg-[#ffde59] p-6 rounded-2xl shadow-lg cursor-pointer transition-transform transform hover:-translate-y-1">
          <h3 className="text-xl font-bold text-gray-800">Games Mentais</h3>
          <p className="text-gray-800 opacity-90 mt-1">Desafie sua mente com jogos divertidos.</p>
        </div>
        <GratitudeJournal />
      </div>
    </div>
  );
};

export default HomeScreen;