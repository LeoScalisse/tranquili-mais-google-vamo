
// types.ts

export type Mood = 'happy' | 'calm' | 'neutral' | 'sad' | 'anxious';

export interface MoodEntry {
  id?: number;
  user_id?: string;
  date: string;
  mood: Mood;
}

export interface UserProfile {
  id?: string;
  name: string;
  path: string;
  reason: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
}

export enum Screen {
  Auth = 'auth',
  Login = 'login',
  Onboarding = 'onboarding',
  Home = 'home',
  Chat = 'chat',
  Games = 'games',
  Reports = 'reports',
  Settings = 'settings',
  News = 'news',
  Gratitude = 'gratitude',
}

export enum ChatMode {
    QUICK = 'quick',
    DEEP = 'deep',
    SEARCH = 'search',
    IMAGE = 'image',
    LIVE = 'live'
}

export interface ChatMessage {
    id: string;
    user_id?: string;
    role: 'user' | 'model';
    text: string;
    image?: string;
    sources?: { uri: string; title: string; }[];
    timestamp: number;
}

export interface AppSettings {
    notificationsEnabled: boolean;
    soundVolume: number;
    iconSet: string;
    healthIntegrations?: {
        googleFit: boolean;
        appleHealth: boolean;
    };
    highScores?: {
        memory: { easy: number | null; medium: number | null; hard: number | null };
        sequence: number;
        dilemma: number;
    };
}
