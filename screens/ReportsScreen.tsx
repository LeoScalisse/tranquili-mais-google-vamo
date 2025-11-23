import React from 'react';
import { Mood, MoodEntry, AppSettings, Achievement } from '../types';
import { MOOD_EMOJIS, MOOD_COLORS, MOOD_OPTIONS } from '../constants';
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
        <div className="bg-white p-4 rounded-xl shadow-md mb-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">Resumo do Humor</h2>
            <div className="flex items-center">
                <span className={`text-5xl mr-4 ${MOOD_COLORS[predominantMood]} p-2 rounded-full`}>{MOOD_EMOJIS[predominantMood]}</span>
                <div>
                    <p className="text-gray-600">Seu humor predominante é <span className="font-bold capitalize text-gray-800">{predominantMood}</span>.</p>
                    <p className="text-sm text-gray-500 mt-1">Baseado em {moodHistory.length} registro(s).</p>
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
        moodCounts[entry.mood]++;
    });
    
    const maxCount = Math.max(...Object.values(moodCounts), 1); // Avoid division by zero

    return (
        <div className="bg-white p-4 rounded-xl shadow-md mb-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Frequência de Humor</h2>
            <div className="flex justify-around items-end h-40 space-x-2">
                {MOOD_OPTIONS.map(mood => {
                    const count = moodCounts[mood];
                    const barHeight = (count / maxCount) * 100;
                    return (
                        <div key={mood} className="flex flex-col items-center flex-1">
                            <span className="text-xs font-semibold text-gray-600 mb-1">{count}</span>
                            <div 
                                className={`w-full rounded-t-md ${MOOD_COLORS[mood]} transition-all duration-500 ease-out`}
                                style={{ height: `${barHeight}%` }}
                                title={`${mood}: ${count} ${count === 1 ? 'vez' : 'vezes'}`}
                            ></div>
                            <span className="text-2xl mt-2">{MOOD_EMOJIS[mood]}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// --- Simulated Health Correlation Data ---
const generateHealthData = (moodEntries: MoodEntry[]) => {
    return moodEntries.map(entry => {
        let sleepHours = 7;
        let steps = 5000;

        switch(entry.mood) {
            case 'happy':
                sleepHours = 7.5 + Math.random();
                steps = 8000 + Math.floor(Math.random() * 3000);
                break;
            case 'calm':
                sleepHours = 8 + Math.random();
                steps = 6000 + Math.floor(Math.random() * 2000);
                break;
            case 'neutral':
                sleepHours = 6.5 + Math.random();
                steps = 4000 + Math.floor(Math.random() * 2000);
                break;
            case 'sad':
                sleepHours = 5 + Math.random() * 3; 
                steps = 2000 + Math.floor(Math.random() * 2000);
                break;
            case 'anxious':
                sleepHours = 4.5 + Math.random() * 2; 
                steps = 3000 + Math.floor(Math.random() * 4000); 
                break;
        }

        return {
            date: entry.date,
            mood: entry.mood,
            sleep: parseFloat(sleepHours.toFixed(1)),
            steps: steps
        };
    }).slice(0, 7); 
};

const HealthCorrelation: React.FC<{ moodHistory: MoodEntry[] }> = ({ moodHistory }) => {
    const data = generateHealthData(moodHistory).reverse(); 

    return (
        <div className="bg-white p-4 rounded-xl shadow-md mb-6">
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-700">Correlação Saúde & Humor</h2>
                <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">Conectado</span>
            </div>
            
            <div className="space-y-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <MoonIcon className="w-4 h-4 text-indigo-500" />
                        <h3 className="text-sm font-semibold text-gray-600">Sono (horas) vs Humor</h3>
                    </div>
                    <div className="h-32 flex items-end justify-between space-x-2">
                        {data.map((d, i) => (
                            <div key={i} className="flex flex-col items-center flex-1 group relative">
                                <div className="absolute bottom-full mb-2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                    {d.sleep}h - {d.mood}
                                </div>
                                <div className="w-full relative flex flex-col justify-end h-full">
                                    <div className="w-full bg-indigo-200 rounded-t-sm" style={{ height: `${(d.sleep / 10) * 100}%` }}></div>
                                    <div className={`absolute bottom-0 left-0 right-0 h-2 ${MOOD_COLORS[d.mood]}`}></div>
                                </div>
                                <span className="text-[10px] text-gray-400 mt-1">{new Date(d.date).getDate()}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <ZapIcon className="w-4 h-4 text-orange-500" />
                        <h3 className="text-sm font-semibold text-gray-600">Passos vs Humor</h3>
                    </div>
                     <div className="h-32 flex items-end justify-between space-x-2">
                        {data.map((d, i) => (
                            <div key={i} className="flex flex-col items-center flex-1 group relative">
                                <div className="absolute bottom-full mb-2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                    {d.steps} passos
                                </div>
                                <div className="w-full relative flex flex-col justify-end h-full">
                                    <div className="w-full bg-orange-200 rounded-t-sm" style={{ height: `${(d.steps / 12000) * 100}%` }}></div>
                                     <div className={`absolute bottom-0 left-0 right-0 h-2 ${MOOD_COLORS[d.mood]}`}></div>
                                </div>
                                <span className="text-[10px] text-gray-400 mt-1">{new Date(d.date).getDate()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const AchievementsSection: React.FC<{ moodHistory: MoodEntry[], chatCount: number }> = ({ moodHistory, chatCount }) => {
    const achievements = checkAchievements(moodHistory, chatCount);
    const unlockedCount = achievements.filter(a => a.unlocked).length;

    return (
        <div className="bg-white p-4 rounded-xl shadow-md mb-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-700">Conquistas</h2>
                <span className="text-sm font-medium text-blue-500 bg-blue-50 px-3 py-1 rounded-full">
                    {unlockedCount} / {achievements.length}
                </span>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
                {achievements.map((ach) => (
                    <div 
                        key={ach.id} 
                        className={`flex items-center p-3 rounded-lg border transition-all duration-300 ${
                            ach.unlocked 
                            ? 'border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50/50 shadow-sm' 
                            : 'border-gray-100 bg-gray-50 opacity-70'
                        }`}
                    >
                        <div className={`p-3 rounded-full mr-4 flex-shrink-0 ${
                            ach.unlocked 
                            ? 'bg-gradient-to-br from-amber-300 to-yellow-500 text-white shadow-md' 
                            : 'bg-gray-200 text-gray-400'
                        }`}>
                            {ach.unlocked ? <TrophyIcon className="w-5 h-5" /> : <LockIcon className="w-5 h-5" />}
                        </div>
                        <div className="flex-1">
                            <h3 className={`font-bold text-sm ${ach.unlocked ? 'text-gray-800' : 'text-gray-500'}`}>
                                {ach.title}
                            </h3>
                            <p className="text-xs text-gray-500 leading-tight mt-0.5">{ach.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ReportsScreen: React.FC<ReportsScreenProps> = ({ moodHistory, settings, chatCount }) => {
    
  if (moodHistory.length === 0) {
      return (
          <div className="p-4 pb-28 bg-gray-50 h-full overflow-y-auto flex flex-col items-center justify-center text-center">
              <h1 className="text-3xl font-bold mb-4 text-gray-800">Sua Evolução</h1>
              <p className="text-gray-500 max-w-sm">
                  Sua jornada está apenas começando. Registre seu humor e interaja com o app para ver seu progresso aqui.
              </p>
          </div>
      );
  }

  // Reverse history to show most recent first for the list
  const sortedHistory = [...moodHistory].reverse();
  const isHealthConnected = settings?.healthIntegrations?.googleFit || settings?.healthIntegrations?.appleHealth;

  return (
    <div className="p-4 pb-28 bg-gray-50 h-full overflow-y-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Sua Evolução</h1>

      <MoodSummary moodHistory={moodHistory} />
      
      <AchievementsSection moodHistory={moodHistory} chatCount={chatCount} />

      <MoodChart moodHistory={moodHistory} />
      
      {/* Only show Health Correlation if enabled in settings */}
      {isHealthConnected && (
          <div className="animate-fade-in">
            <HealthCorrelation moodHistory={moodHistory} />
          </div>
      )}
      
      <h2 className="text-xl font-bold mb-4 text-gray-700">Diário de Humor</h2>
      <div className="space-y-3">
        {sortedHistory.map((entry, index) => (
          <div 
            key={index} 
            className={`flex items-center p-4 rounded-xl shadow-md bg-white border-l-4 ${MOOD_COLORS[entry.mood].replace('bg-', 'border-')}`}
          >
            <span className="text-4xl mr-4">{MOOD_EMOJIS[entry.mood]}</span>
            <div>
              <p className="font-bold text-lg text-gray-800 capitalize">{entry.mood}</p>
              <p className="text-sm text-gray-600">{new Date(entry.date).toLocaleDateString('pt-BR', { timeZone: 'UTC', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReportsScreen;