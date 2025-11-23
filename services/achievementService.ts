import { Achievement, MoodEntry } from '../types';

const ALL_ACHIEVEMENTS: Omit<Achievement, 'unlocked'>[] = [
    { id: 'first_log', title: 'Primeiro Passo', description: 'Você registrou seu primeiro humor!' },
    { id: 'three_day_streak', title: 'Consistência é Chave', description: 'Registrou o humor por 3 dias seguidos.' },
    { id: 'week_streak', title: 'Hábito Saudável', description: 'Registrou o humor por 7 dias seguidos.' },
    { id: 'first_happy', title: 'Momento Feliz', description: 'Registrou "feliz" pela primeira vez.' },
    { id: 'first_calm', title: 'Encontrando a Calma', description: 'Registrou "calmo" pela primeira vez.' },
    { id: 'first_chat', title: 'Abrindo o Coração', description: 'Iniciou sua primeira conversa com a Tranquilinha.' },
];

// This is a simplified service. A real app might store unlocked achievements separately.
export const checkAchievements = (moodHistory: MoodEntry[], chatMessagesCount: number): Achievement[] => {
    const unlockedAchievements = new Set<string>();

    // First Log
    if (moodHistory.length >= 1) {
        unlockedAchievements.add('first_log');
    }

    // Streaks
    if (moodHistory.length >= 3) {
        const sortedDates = moodHistory.map(h => new Date(h.date).getTime()).sort((a, b) => a - b);
        let currentStreak = 1;
        for (let i = 1; i < sortedDates.length; i++) {
            const diff = (sortedDates[i] - sortedDates[i-1]) / (1000 * 60 * 60 * 24);
            if (diff === 1) {
                currentStreak++;
            } else if (diff > 1) {
                currentStreak = 1;
            }
        }
        if (currentStreak >= 3) unlockedAchievements.add('three_day_streak');
        if (currentStreak >= 7) unlockedAchievements.add('week_streak');
    }

    // Mood specific
    if (moodHistory.some(h => h.mood === 'happy')) {
        unlockedAchievements.add('first_happy');
    }
    if (moodHistory.some(h => h.mood === 'calm')) {
        unlockedAchievements.add('first_calm');
    }
    
    // Chat
    if (chatMessagesCount > 1) { // more than the initial message
        unlockedAchievements.add('first_chat');
    }

    return ALL_ACHIEVEMENTS.map(ach => ({
        ...ach,
        unlocked: unlockedAchievements.has(ach.id)
    }));
};
