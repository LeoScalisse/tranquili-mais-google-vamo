
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UserProfile, Screen, Mood, MoodEntry, AppSettings, ChatMessage, ChatMode, Achievement } from './types';
import OnboardingScreen from './screens/OnboardingScreen';
import HomeScreen from './screens/HomeScreen';
import ChatScreen from './screens/ChatScreen';
import GamesScreen from './screens/GamesScreen';
import ReportsScreen from './screens/ReportsScreen';
import SettingsScreen from './screens/SettingsScreen';
import NewsScreen from './screens/NewsScreen';
import GratitudeScreen from './screens/GratitudeScreen';
import BottomNav from './components/BottomNav';
import { setMasterVolume, playSound } from './services/soundService';
import AuthScreen from './screens/AuthScreen';
import LoginScreen from './screens/LoginScreen';
import RegistrationModal from './components/RegistrationModal';
import SideMenu from './components/SideMenu';
import { supabase, saveChatMessage, getUserChatHistory } from './services/supabaseClient';
import { User } from '@supabase/supabase-js';
import { getQuickResponseStream, getComplexResponse, getGroundedResponse, generateCalmImage, createFlashLiteChat, getMultimodalResponse } from './services/geminiService';
import { Chat } from '@google/genai';
import { checkAchievements } from './services/achievementService';
import { AchievementPopup } from './components/ui/AchievementPopup';
import { PWALifecycle } from './components/PWALifecycle';

const screenOrder = [Screen.Home, Screen.Chat, Screen.Gratitude, Screen.News, Screen.Games, Screen.Reports, Screen.Settings];

const getDefaultSettings = (): AppSettings => ({
  notificationsEnabled: true,
  soundVolume: 0.5,
  iconSet: 'default',
  healthIntegrations: { googleFit: false, appleHealth: false },
  highScores: {
      memory: { easy: null, medium: null, hard: null },
      sequence: 0,
      dilemma: 0
  }
});

export const BrandText: React.FC<{ text: string }> = ({ text }) => {
    if (!text) return null;
    const parts = text.split(/(mais|\+)/gi);
    return (
        <>
            {parts.map((part, i) => {
                const lower = part.toLowerCase();
                if (lower === 'mais' || lower === '+') return <span key={i} className="brand-plus">+</span>;
                return part;
            })}
        </>
    );
};

const App: React.FC = () => {
  const [authStatus, setAuthStatus] = useState<'loading' | 'unauthenticated' | 'guest' | 'authenticated'>('loading');
  const [authFlowScreen, setAuthFlowScreen] = useState<Screen>(Screen.Auth);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [moodHistory, setMoodHistory] = useState<MoodEntry[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [settings, setSettings] = useState<AppSettings>(getDefaultSettings());
  const [activeScreen, setActiveScreen] = useState<Screen>(Screen.Home);
  const [previousScreen, setPreviousScreen] = useState<Screen | null>(null);
  const [direction, setDirection] = useState<'right' | 'left' | null>(null);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatSessionRef = useRef<Chat | null>(null);
  const [unlockedAchievements, setUnlockedAchievements] = useState<Set<string>>(new Set());
  const [notificationQueue, setNotificationQueue] = useState<Achievement[]>([]);
  const [achievementsInitialized, setAchievementsInitialized] = useState(false);

  useEffect(() => {
    chatSessionRef.current = createFlashLiteChat();
    const checkInitialSession = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setCurrentUser(session.user);
                await fetchUserData(session.user);
            } else {
                setAuthStatus('unauthenticated');
                setAuthFlowScreen(Screen.Auth);
            }
        } catch (e) {
            setAuthStatus('unauthenticated');
        }
    };
    checkInitialSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setCurrentUser(session.user);
        if (authStatus !== 'authenticated') fetchUserData(session.user);
      } else {
        setCurrentUser(null);
        if (authStatus === 'authenticated') handleLogout(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (user: User) => {
    try {
        let { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (!profileData && user.user_metadata?.name) {
            const newProfile = {
                id: user.id,
                name: user.user_metadata.name,
                path: user.user_metadata.path || '',
                reason: user.user_metadata.reason || '',
                settings: user.user_metadata.settings || getDefaultSettings()
            };
            await supabase.from('profiles').insert(newProfile);
            profileData = newProfile;
        }
        if (profileData) {
            setUserProfile({ id: profileData.id, name: profileData.name, path: profileData.path, reason: profileData.reason });
            setSettings({ ...getDefaultSettings(), ...(profileData.settings || {}) });
            const [{ data: moods }, chats] = await Promise.all([
                supabase.from('mood_history').select('*').eq('user_id', user.id).order('date', { ascending: true }),
                getUserChatHistory(user.id)
            ]);
            setMoodHistory(moods || []);
            setChatHistory(chats || []);
            setAuthStatus('authenticated');
            setActiveScreen(Screen.Home);
        }
    } catch (error) {
        console.error('Error fetching profile:', error);
    }
  };

  useEffect(() => {
      if (!userProfile) return;
      const allAchievements = checkAchievements(moodHistory, chatHistory.length);
      const currentlyUnlockedIds = new Set(allAchievements.filter(a => a.unlocked).map(a => a.id));
      if (!achievementsInitialized) {
          setUnlockedAchievements(currentlyUnlockedIds);
          setAchievementsInitialized(true);
      } else {
          const newUnlocks = allAchievements.filter(a => a.unlocked && !unlockedAchievements.has(a.id));
          if (newUnlocks.length > 0) {
              newUnlocks.forEach(ach => {
                  setNotificationQueue(prev => [...prev, ach]);
                  playSound('victory');
              });
              setUnlockedAchievements(currentlyUnlockedIds);
          }
      }
  }, [moodHistory, chatHistory, userProfile, achievementsInitialized, unlockedAchievements]);

  const handleDismissNotification = () => setNotificationQueue(prev => prev.slice(1));

  const handleOnboardingComplete = (profile: UserProfile) => {
    setUserProfile(profile);
    setAuthStatus('guest');
    setActiveScreen(Screen.Home);
  };
  
  const handleRegister = async (email: string, pass: string) => {
    if (!userProfile) return { error: { message: 'Perfil não encontrado.' } };
    const guestData = { profile: userProfile, moods: moodHistory, chats: chatHistory };
    const { data, error } = await supabase.auth.signUp({
        email, password: pass,
        options: { data: { ...guestData.profile, settings } }
    });
    if (error) return { error };
    if (data.user) {
        await supabase.from('profiles').upsert({ ...guestData.profile, id: data.user.id, settings });
        const moodInserts = guestData.moods.map(m => ({ ...m, user_id: data.user!.id }));
        const chatPromises = guestData.chats.map(msg => saveChatMessage(msg, data.user!.id));
        await Promise.all([
            moodInserts.length > 0 ? supabase.from('mood_history').insert(moodInserts) : Promise.resolve(),
            ...chatPromises
        ]);
    }
    setShowRegistrationModal(false);
    if (pendingAction) { pendingAction(); setPendingAction(null); }
    return { error: null };
  };

  const handleLogout = async (doSignOut = true) => {
    if (doSignOut) await supabase.auth.signOut();
    setUserProfile(null);
    setMoodHistory([]);
    setChatHistory([]);
    setSettings(getDefaultSettings());
    setAuthStatus('unauthenticated');
    setAuthFlowScreen(Screen.Auth);
    setActiveScreen(Screen.Home);
    setIsSideMenuOpen(false);
    setUnlockedAchievements(new Set());
    setNotificationQueue([]);
    setAchievementsInitialized(false);
  };

  const handleProtectedAction = useCallback((action: () => void) => {
    if (authStatus === 'guest') {
      setPendingAction(() => action);
      setShowRegistrationModal(true);
    } else if (authStatus === 'authenticated') {
      action();
    }
  }, [authStatus]);

  useEffect(() => {
    setMasterVolume(settings.soundVolume);
    if (authStatus === 'authenticated' && userProfile?.id) {
        supabase.from('profiles').update({ settings }).eq('id', userProfile.id).then();
    }
  }, [settings, authStatus, userProfile]);

  const handleSetActiveScreen = (newScreen: Screen) => {
      if (newScreen === activeScreen) return;
      const currentIndex = screenOrder.indexOf(activeScreen);
      const newIndex = screenOrder.indexOf(newScreen);
      setDirection(newIndex > currentIndex ? 'right' : 'left');
      setPreviousScreen(activeScreen);
      setActiveScreen(newScreen);
  };

  const handleMoodSelect = async (mood: Mood) => {
    const today = new Date().toISOString().split('T')[0];
    if (moodHistory.some(entry => entry.date === today)) return;
    const newEntry: MoodEntry = { date: today, mood };
    setMoodHistory([...moodHistory, newEntry]);
    if (authStatus === 'authenticated' && currentUser) {
        await supabase.from('mood_history').insert({ ...newEntry, user_id: currentUser.id });
    }
  };
  
  const handleSendMessage = async (message: string, files: File[]) => {
    const userMessageText = message.replace(/\[(Search|Think|Canvas): (.*)\]/s, '$2').trim();
    if (!userMessageText && files.length === 0) return;
    let imagePreview: string | undefined = undefined;
    if (files.length > 0) imagePreview = URL.createObjectURL(files[0]);
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', text: userMessageText, image: imagePreview, timestamp: Date.now() };
    setChatHistory(prev => [...prev, userMessage]);
    setIsChatLoading(true);
    if (authStatus === 'authenticated' && currentUser) saveChatMessage(userMessage, currentUser.id);
    try {
        const modelMessageId = crypto.randomUUID();
        let modelResponseText = '';
        let modelResponseImage: string | undefined = undefined;
        let modelResponseSources: any[] | undefined = undefined;
        let currentMode = ChatMode.QUICK;
        if (message.startsWith('[Search:')) currentMode = ChatMode.SEARCH;
        else if (message.startsWith('[Think:')) currentMode = ChatMode.DEEP;
        else if (message.startsWith('[Canvas:')) currentMode = ChatMode.IMAGE;
        
        if (files.length > 0 && currentMode === ChatMode.QUICK) {
             const base64 = await new Promise<string>((res) => {
                const reader = new FileReader();
                reader.onload = (e) => res((e.target?.result as string).split(',')[1]);
                reader.readAsDataURL(files[0]);
             });
             const response = await getMultimodalResponse(userMessageText, base64, files[0].type);
             modelResponseText = response.text || '';
        } else {
             switch (currentMode) {
                case ChatMode.DEEP: modelResponseText = await getComplexResponse(userMessageText); break;
                case ChatMode.SEARCH:
                    const searchResp = await getGroundedResponse(userMessageText);
                    modelResponseText = searchResp.text || '';
                    modelResponseSources = searchResp.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((c: any) => c.web).filter(Boolean) || [];
                    break;
                case ChatMode.IMAGE:
                    modelResponseText = "Aqui está uma imagem para te inspirar:";
                    modelResponseImage = await generateCalmImage(userMessageText);
                    break;
                default:
                    if (chatSessionRef.current) {
                        const stream = await getQuickResponseStream(chatSessionRef.current, userMessageText);
                        const placeholder: ChatMessage = { id: modelMessageId, role: 'model', text: '', timestamp: Date.now() };
                        setChatHistory(prev => [...prev, placeholder]);
                        for await (const chunk of stream) {
                            modelResponseText += chunk.text;
                            setChatHistory(prev => prev.map(m => m.id === modelMessageId ? { ...m, text: modelResponseText } : m));
                        }
                    }
                    break;
             }
        }
        const finalMsg: ChatMessage = { id: modelMessageId, role: 'model', text: modelResponseText, image: modelResponseImage, sources: modelResponseSources, timestamp: Date.now() };
        if (currentMode !== ChatMode.QUICK) setChatHistory(prev => [...prev, finalMsg]);
        else setChatHistory(prev => prev.map(m => m.id === modelMessageId ? finalMsg : m));
        if (authStatus === 'authenticated' && currentUser) saveChatMessage(finalMsg, currentUser.id);
        playSound('receive');
    } catch (e) { playSound('error'); } finally { setIsChatLoading(false); }
  };

  const renderCurrentScreen = (screen: Screen) => {
    const props = { userProfile, moodHistory, onMoodSelect: handleMoodSelect, navigateTo: handleSetActiveScreen, handleProtectedAction, onOpenSideMenu: () => setIsSideMenuOpen(true), chatHistory, onSendMessage: handleSendMessage, isLoading: isChatLoading, settings, setSettings, onLogout: handleLogout };
    switch (screen) {
      case Screen.Chat: return <ChatScreen chatHistory={props.chatHistory} onSendMessage={props.onSendMessage} isLoading={props.isLoading} handleProtectedAction={props.handleProtectedAction} />;
      case Screen.Games: return <GamesScreen handleProtectedAction={props.handleProtectedAction} settings={props.settings} setSettings={props.setSettings} />;
      case Screen.Reports: return <ReportsScreen moodHistory={props.moodHistory} settings={props.settings} chatCount={props.chatHistory.length} />;
      case Screen.Settings: return <SettingsScreen settings={props.settings} setSettings={props.setSettings} onLogout={props.onLogout} />;
      case Screen.News: return <NewsScreen />;
      case Screen.Gratitude: return <GratitudeScreen />;
      default: return <HomeScreen userProfile={props.userProfile!} moodHistory={props.moodHistory} onMoodSelect={props.onMoodSelect} navigateTo={props.navigateTo} handleProtectedAction={props.handleProtectedAction} onOpenSideMenu={props.onOpenSideMenu} />;
    }
  };

  if (authStatus === 'loading') return <div className="h-[100dvh] w-screen bg-gray-50 flex items-center justify-center"></div>;

  if (authStatus === 'unauthenticated') {
    switch (authFlowScreen) {
      case Screen.Login: return <LoginScreen onBack={() => setAuthFlowScreen(Screen.Auth)} />;
      case Screen.Onboarding: return <OnboardingScreen onComplete={handleOnboardingComplete} />;
      default: return <AuthScreen onNewUser={() => setAuthFlowScreen(Screen.Onboarding)} onExistingUser={() => setAuthFlowScreen(Screen.Login)} />;
    }
  }

  return (
    <div className="font-sans">
      <PWALifecycle />
      {showRegistrationModal && <RegistrationModal onRegister={handleRegister} onSkip={() => { setShowRegistrationModal(false); setPendingAction(null); }} />}
      {notificationQueue.length > 0 && <AchievementPopup key={notificationQueue[0].id} title={notificationQueue[0].title} description={notificationQueue[0].description} onClose={handleDismissNotification} />}
      {userProfile && <SideMenu isOpen={isSideMenuOpen} onClose={() => setIsSideMenuOpen(false)} userProfile={userProfile} userEmail={currentUser?.email} onNavigate={(s) => { handleSetActiveScreen(s); setIsSideMenuOpen(false); }} onLogout={() => handleLogout()} />}
      <main className="relative h-[100dvh] w-screen overflow-hidden">
        {previousScreen && (
            <div key={previousScreen} className={`absolute inset-0 w-full h-full ${direction === 'right' ? 'animate-slide-out-to-left' : 'animate-slide-out-to-right'}`}>
                {renderCurrentScreen(previousScreen)}
            </div>
        )}
        <div key={activeScreen} className={`absolute inset-0 w-full h-full ${direction ? (direction === 'right' ? 'animate-slide-in-from-right' : 'animate-slide-in-from-left') : ''}`}>
            {renderCurrentScreen(activeScreen)}
        </div>
      </main>
      <BottomNav activeScreen={activeScreen} setActiveScreen={handleSetActiveScreen} settings={settings} />
    </div>
  );
};

export default App;
