
import React from 'react';
import { Mood, MoodEntry, AppSettings } from '../types';
import { MOOD_EMOJIS, MOOD_HEX_COLORS, MOOD_OPTIONS } from '../constants';
import { HeartIcon, MoonIcon, ZapIcon, TrophyIcon, LockIcon } from '../components/ui/Icons';
import { checkAchievements } from '../services/achievementService';

interface ReportsScreenProps {
  moodHistory: MoodEntry[];
  settings?: AppSettings;
  chatCount: number;
}

const MoodSummary: React.FC<{ moodHistory: MoodEntry[] }> = ({ moodHistory }) => {
    if (moodHistory.length === 0) return null;
    const moodCounts = moodHistory.reduce((acc, entry) => {
        acc[entry.mood] = (acc[entry.mood] || 0) + 1;
        return acc;
    }, {} as Record<Mood, number>);
    const predominantMood = Object.keys(moodCounts).reduce((a, b) => moodCounts[a as Mood] > moodCounts[b as Mood] ? a : b) as Mood;

    return (
        <div className="bg-white p-6 rounded-2xl shadow-md mb-6 border-l-8 border-[#38b6ff]">
            <h2 className="text-lg font-bold text-gray-700 mb-3 uppercase tracking-wider">Humor Predominante</h2>
            <div className="flex items-center">
                <span className="text-6xl mr-6 filter drop-shadow-md">{MOOD_EMOJIS[predominantMood]}</span>
                <div>
                    <p className="text-gray-800 text-xl font-medium">Você tem se sentido <span className="text-[#38b6ff] font-bold capitalize">{predominantMood}</span> na maior parte do tempo.</p>
                    <p className="text-sm text-gray-400 mt-2 italic">Análise baseada em {moodHistory.length} registros.</p>
                </div>
            </div>
        </div>
    );
};

const MoodChart: React.FC<{ moodHistory: MoodEntry[] }> = ({ moodHistory }) => {
    const moodCounts = MOOD_OPTIONS.reduce((acc, mood) => {
        acc[mood] = 0;
        return acc;
    }, {} as Record<Mood, number>);
    moodHistory.forEach(entry => {
        if (moodCounts[entry.mood] !== undefined) {
            moodCounts[entry.mood]++;
        }
    });
    const maxCount = Math.max(...Object.values(moodCounts), 1);

    return (
        <div className="bg-white p-6 rounded-2xl shadow-md mb-6">
            <h2 className="text-lg font-bold text-gray-700 mb-6 uppercase tracking-wider">Frequência de Humores</h2>
            <div className="flex justify-around items-end h-48 space-x-2">
                {MOOD_OPTIONS.map(mood => {
                    const count = moodCounts[mood];
                    const barHeight = (count / maxCount) * 100;
                    return (
                        <div key={mood} className="flex flex-col items-center flex-1 h-full justify-end">
                            <span className="text-xs font-bold text-[#38b6ff] mb-1">{count > 0 ? count : ''}</span>
                            <div 
                                className="w-full rounded-t-lg transition-all duration-1000 ease-out"
                                style={{ height: `${barHeight}%`, backgroundColor: MOOD_HEX_COLORS[mood] }}
                            />
                            <span className="text-2xl mt-3 filter drop-shadow-sm">{MOOD_EMOJIS[mood]}</span>
                            <span className="text-[10px] font-bold text-gray-400 mt-1 uppercase truncate w-full text-center">{mood.slice(0, 3)}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const AchievementsSection: React.FC<{ moodHistory: MoodEntry[], chatCount: number }> = ({ moodHistory, chatCount }) => {
    const achievements = checkAchievements(moodHistory, chatCount);
    const unlockedCount = achievements.filter(a => a.unlocked).length;
    return (
        <div className="bg-white p-4 rounded-xl shadow-md mb-6">
            <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold text-gray-700">CONQUISTAS</h2><span className="text-sm font-bold text-[#38b6ff] bg-blue-50 px-3 py-1 rounded-full">{unlockedCount}/{achievements.length}</span></div>
            <div className="grid grid-cols-1 gap-3">
                {achievements.map((ach) => (
                    <div key={ach.id} className={`flex items-center p-3 rounded-lg border transition-all ${ach.unlocked ? 'border-amber-200 bg-yellow-50/30' : 'border-gray-100 bg-gray-50 opacity-50'}`}>
                        <div className={`p-3 rounded-full mr-4 ${ach.unlocked ? 'bg-yellow-400 text-white' : 'bg-gray-200 text-gray-400'}`}>{ach.unlocked ? <TrophyIcon className="w-5 h-5" /> : <LockIcon className="w-5 h-5" />}</div>
                        <div className="flex-1"><h3 className="font-bold text-sm">{ach.title}</h3><p className="text-xs text-gray-500">{ach.description}</p></div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ReportsScreen: React.FC<ReportsScreenProps> = ({ moodHistory, settings, chatCount }) => {
  if (moodHistory.length === 0) {
      return (
          <div className="p-4 pb-28 bg-gray-50 h-full flex flex-col items-center justify-center text-center">
              <span className="text-6xl mb-4">📈</span>
              <h1 className="text-3xl font-bold mb-4">Sua Evolução</h1>
              <p className="text-gray-500 max-w-sm">Registre seu primeiro humor para começar a ver gráficos e estatísticas aqui.</p>
          </div>
      );
  }
  return (
    <div className="p-4 pb-28 bg-gray-50 h-full overflow-y-auto">
      <h1 className="text-3xl font-bold mb-6">Sua Evolução</h1>
      <MoodSummary moodHistory={moodHistory} />
      <MoodChart moodHistory={moodHistory} />
      <AchievementsSection moodHistory={moodHistory} chatCount={chatCount} />
      <h2 className="text-xl font-bold mb-4 text-gray-700">Histórico Recente</h2>
      <div className="space-y-3">
        {[...moodHistory].reverse().slice(0, 10).map((entry, idx) => (
          <div key={idx} className="flex items-center p-4 rounded-xl shadow-sm bg-white border-l-4 border-gray-200">
            <span className="text-4xl mr-4">{MOOD_EMOJIS[entry.mood]}</span>
            <div><p className="font-bold text-gray-800 capitalize">{entry.mood}</p><p className="text-xs text-gray-500">{new Date(entry.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</p></div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default ReportsScreen;
