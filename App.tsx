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
import { User, Session } from '@supabase/supabase-js';
import { getQuickResponseStream, getComplexResponse, getGroundedResponse, generateCalmImage, createFlashLiteChat, getMultimodalResponse } from './services/geminiService';
import { Chat } from '@google/genai';
import { checkAchievements } from './services/achievementService';
import { AchievementPopup } from './components/ui/AchievementPopup';
import { PWALifecycle } from './components/PWALifecycle';

const screenOrder = [Screen.Home, Screen.Chat, Screen.Gratitude, Screen.News, Screen.Games, Screen.Reports, Screen.Settings];

// --- Default State ---
const getDefaultSettings = (): AppSettings => ({
  notificationsEnabled: true,
  soundVolume: 0.5,
  iconSet: 'default',
  healthIntegrations: {
      googleFit: false,
      appleHealth: false
  }
});

const App: React.FC = () => {
  const [authStatus, setAuthStatus] = useState<'loading' | 'unauthenticated' | 'guest' | 'authenticated'>('loading');
  const [configError, setConfigError] = useState<string | null>(null);
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

  // Achievement State
  const [unlockedAchievements, setUnlockedAchievements] = useState<Set<string>>(new Set());
  const [notificationQueue, setNotificationQueue] = useState<Achievement[]>([]);
  const [achievementsInitialized, setAchievementsInitialized] = useState(false);

  // --- Supabase Auth & Data Management ---
  useEffect(() => {
    chatSessionRef.current = createFlashLiteChat();

    const checkInitialSession = async () => {
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) throw error;
            if (session) {
                setCurrentUser(session.user);
                await fetchUserData(session.user);
            } else {
                setAuthStatus('unauthenticated');
                setAuthFlowScreen(Screen.Auth);
            }
        } catch (e: any) {
            if (e instanceof TypeError && e.message.toLowerCase().includes('failed to fetch')) {
                console.error("Fetch error connecting to Supabase. Please ensure SUPABASE_URL and SUPABASE_ANON_KEY environment variables are correctly set.", e);
                setConfigError("Erro de configuração: Não foi possível conectar ao servidor. Verifique se as variáveis de ambiente SUPABASE_URL e SUPABASE_ANON_KEY estão configuradas corretamente.");
            } else {
                console.error("An unexpected error occurred during startup:", e);
                setConfigError(`Ocorreu um erro ao conectar: ${e.message}`);
            }
            setAuthStatus('unauthenticated'); // Fallback state
        }
    };
    checkInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setCurrentUser(session.user);
        // Only fetch user data if we weren't already authenticated
        if (authStatus !== 'authenticated') {
            fetchUserData(session.user);
        }
      } else {
        setCurrentUser(null);
        // Only trigger logout flow if the user was previously logged in
        if (authStatus === 'authenticated') {
            handleLogout(false);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []); // <-- IMPORTANT: Empty dependency array ensures this runs only once on mount.

  const fetchUserData = async (user: User) => {
    try {
        let { data: profileData, error: profileError } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        
        // --- SELF-HEALING LOGIC ---
        if ((!profileData || (profileError && profileError.code === 'PGRST116')) && user.user_metadata?.name) {
            console.log("Profile not found, attempting to create from metadata...");
            const newProfile = {
                id: user.id,
                name: user.user_metadata.name,
                path: user.user_metadata.path || '',
                reason: user.user_metadata.reason || '',
                settings: user.user_metadata.settings || getDefaultSettings()
            };
            
            const { error: insertError } = await supabase.from('profiles').insert(newProfile);
            
            if (!insertError) {
                profileData = newProfile;
                profileError = null;
            } else {
                console.error("Failed to auto-create profile:", insertError);
            }
        }

        if (profileError || !profileData) throw profileError || new Error("Profile not found and could not be created.");

        setUserProfile({ id: profileData.id, name: profileData.name, path: profileData.path, reason: profileData.reason });
        setSettings({ ...getDefaultSettings(), ...(profileData.settings || {}) });

        // Fetch Moods and Chats in parallel
        const [{ data: moods }, chats] = await Promise.all([
            supabase.from('mood_history').select('*').eq('user_id', user.id).order('date', { ascending: true }),
            getUserChatHistory(user.id) // Use service function for chat history
        ]);

        setMoodHistory(moods || []);
        setChatHistory(chats || []);

        setAuthStatus('authenticated');
        setActiveScreen(Screen.Home);
    } catch (error: any) {
        console.error('Error fetching profile:', error?.message || error);
        if (error?.message?.includes('relation "public.profiles" does not exist') || error?.code === '42P01') {
             setConfigError("Erro Crítico: A tabela 'profiles' não foi encontrada no banco de dados. Por favor, execute o script SQL fornecido no editor do Supabase.");
        } else {
             setConfigError(`Erro ao carregar dados do usuário: ${error?.message || 'Erro desconhecido'}. Tente recarregar a página.`);
        }
    }
  };

  // --- Achievement Logic ---
  useEffect(() => {
      if (!userProfile) return;

      const allAchievements = checkAchievements(moodHistory, chatHistory.length);
      const currentlyUnlockedIds = new Set(allAchievements.filter(a => a.unlocked).map(a => a.id));

      if (!achievementsInitialized) {
          // First check: just sync state, don't notify for pre-existing achievements
          setUnlockedAchievements(currentlyUnlockedIds);
          setAchievementsInitialized(true);
      } else {
          // Subsequent checks: find newly unlocked achievements
          const newUnlocks = allAchievements.filter(a => a.unlocked && !unlockedAchievements.has(a.id));
          
          if (newUnlocks.length > 0) {
              newUnlocks.forEach(ach => {
                  setNotificationQueue(prev => [...prev, ach]);
                  playSound('victory');
              });
              setUnlockedAchievements(currentlyUnlockedIds);
          }
      }
  }, [moodHistory, chatHistory, userProfile, achievementsInitialized, unlockedAchievements]); // Re-run when data changes

  const handleDismissNotification = () => {
      setNotificationQueue(prev => prev.slice(1));
  };

  const handleOnboardingComplete = (profile: UserProfile) => {
    setUserProfile(profile);
    setAuthStatus('guest');
    setActiveScreen(Screen.Home);
  };
  
  const handleRegister = async (email: string, pass: string) => {
    if (!userProfile) return { error: { message: 'Perfil do usuário não encontrado.' } };

    const guestData = {
        profile: userProfile,
        moods: moodHistory,
        chats: chatHistory,
    };

    const { data, error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: {
            data: {
                name: guestData.profile.name,
                path: guestData.profile.path,
                reason: guestData.profile.reason,
                settings: settings,
            }
        }
    });

    if (error) return { error };
    
    if (data.user && data.session) {
        const { error: profileError } = await supabase.from('profiles').upsert({
            id: data.user.id,
            name: guestData.profile.name,
            path: guestData.profile.path,
            reason: guestData.profile.reason,
            settings: settings
        });

        if (profileError) {
            console.error("Error creating profile record:", JSON.stringify(profileError));
        }

        const moodInserts = guestData.moods.map(m => ({ ...m, user_id: data.user!.id }));
        
        // Use the service to save all chat messages
        const chatPromises = guestData.chats.map(msg => saveChatMessage(msg, data.user!.id));
        
        await Promise.all([
            moodInserts.length > 0 ? supabase.from('mood_history').insert(moodInserts) : Promise.resolve(),
            ...chatPromises
        ]);
    }
    
    setShowRegistrationModal(false);
    if (pendingAction) {
        pendingAction();
        setPendingAction(null);
    }

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

  // --- UI Effects & Navigation ---

  useEffect(() => {
    setMasterVolume(settings.soundVolume);
    if (authStatus === 'authenticated' && userProfile && userProfile.id) {
        supabase.from('profiles').update({ settings }).eq('id', userProfile.id).then();
    }
  }, [settings, authStatus, userProfile]);

  useEffect(() => {
    if (previousScreen) {
        const timer = setTimeout(() => setPreviousScreen(null), 300);
        return () => clearTimeout(timer);
    }
  }, [previousScreen]);

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
    if (files.length > 0) {
        imagePreview = URL.createObjectURL(files[0]);
    }
    
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', text: userMessageText, image: imagePreview, timestamp: Date.now() };
    const newHistory = [...chatHistory, userMessage];
    setChatHistory(newHistory);
    setIsChatLoading(true);

    // Persist User Message
    if (authStatus === 'authenticated' && currentUser) {
        saveChatMessage(userMessage, currentUser.id);
    }

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
             const file = files[0];
             const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (event) => resolve((event.target?.result as string).split(',')[1]);
                reader.onerror = error => reject(error);
                reader.readAsDataURL(file);
             });
             const response = await getMultimodalResponse(userMessageText, base64, file.type);
             modelResponseText = response.text || '';
        } else {
             switch (currentMode) {
                case ChatMode.DEEP:
                    modelResponseText = await getComplexResponse(userMessageText);
                    break;
                case ChatMode.SEARCH:
                    const searchResponse = await getGroundedResponse(userMessageText);
                    modelResponseText = searchResponse.text || '';
                    modelResponseSources = searchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => chunk.web).filter(Boolean) as { uri: string, title: string }[] || [];
                    break;
                case ChatMode.IMAGE:
                    modelResponseText = "Aqui está uma imagem para te inspirar:";
                    modelResponseImage = await generateCalmImage(userMessageText);
                    break;
                case ChatMode.QUICK:
                default:
                    if (chatSessionRef.current) {
                        const stream = await getQuickResponseStream(chatSessionRef.current, userMessageText);
                        const placeholderMessage: ChatMessage = { id: modelMessageId, role: 'model', text: '', timestamp: Date.now() };
                        setChatHistory(prev => [...prev, placeholderMessage]);
                        for await (const chunk of stream) {
                            modelResponseText += chunk.text;
                            setChatHistory(prev => prev.map(m => m.id === modelMessageId ? { ...m, text: modelResponseText } : m));
                        }
                    }
                    break;
             }
        }
        
        const finalModelMessage: ChatMessage = { id: modelMessageId, role: 'model', text: modelResponseText, image: modelResponseImage, sources: modelResponseSources, timestamp: Date.now() };
        
        // Update UI with final message (if strict mode or image gen, otherwise stream handled it)
        if (currentMode !== ChatMode.QUICK) {
            setChatHistory(prev => [...prev, finalModelMessage]);
        } else {
            setChatHistory(prev => prev.map(m => m.id === modelMessageId ? finalModelMessage : m));
        }

        // Persist Model Message
        if (authStatus === 'authenticated' && currentUser) {
            saveChatMessage(finalModelMessage, currentUser.id);
        }
        playSound('receive');
    } catch (error) {
        console.error("Error calling Gemini:", error);
        const errorMessage: ChatMessage = { id: 'error', role: 'model', text: 'Desculpe, algo deu errado. Tente novamente.', timestamp: Date.now() };
        setChatHistory(prev => [...prev, errorMessage]);
        if (authStatus === 'authenticated' && currentUser) {
            saveChatMessage(errorMessage, currentUser.id);
        }
        playSound('error');
    } finally {
        setIsChatLoading(false);
    }
  };

  // --- Render Logic ---
  if (configError) {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-red-50 text-red-800 p-4 text-center h-[100dvh]">
            <h1 className="text-2xl font-bold mb-4">Atenção</h1>
            <p className="max-w-md">{configError}</p>
            <p className="mt-4 text-sm text-red-600">Verifique o console para mais detalhes técnicos.</p>
        </div>
    );
  }

  if (authStatus === 'loading') {
    return <div className="h-[100dvh] w-screen bg-gray-50 flex items-center justify-center"></div>;
  }

  if (authStatus === 'unauthenticated') {
    switch (authFlowScreen) {
      case Screen.Login:
        return <LoginScreen onBack={() => setAuthFlowScreen(Screen.Auth)} />;
      case Screen.Onboarding:
        return <OnboardingScreen onComplete={handleOnboardingComplete} />;
      case Screen.Auth:
      default:
        return <AuthScreen onNewUser={() => setAuthFlowScreen(Screen.Onboarding)} onExistingUser={() => setAuthFlowScreen(Screen.Login)} />;
    }
  }

  if (!userProfile) {
    if (authStatus === 'guest') {
        setAuthStatus('unauthenticated');
        setAuthFlowScreen(Screen.Auth);
    }
    return <div className="h-[100dvh] w-screen bg-gray-50 flex items-center justify-center"></div>;
  }
  
  const renderScreen = (screenToRender: Screen | null) => {
    if (!screenToRender) return null;
    
    switch (screenToRender) {
      case Screen.Chat:
        return <ChatScreen chatHistory={chatHistory} onSendMessage={handleSendMessage} isLoading={isChatLoading} handleProtectedAction={handleProtectedAction} />;
      case Screen.Games:
        return <GamesScreen handleProtectedAction={handleProtectedAction} />;
      case Screen.Reports:
        return <ReportsScreen moodHistory={moodHistory} settings={settings} chatCount={chatHistory.length} />;
      case Screen.Settings:
        return <SettingsScreen settings={settings} setSettings={setSettings} onLogout={handleLogout} />;
      case Screen.News:
        return <NewsScreen />;
      case Screen.Gratitude:
        return <GratitudeScreen />;
      case Screen.Home:
      default:
        return <HomeScreen userProfile={userProfile} moodHistory={moodHistory} onMoodSelect={handleMoodSelect} navigateTo={handleSetActiveScreen} handleProtectedAction={handleProtectedAction} onOpenSideMenu={() => setIsSideMenuOpen(true)} />;
    }
  };

  return (
    <div className="font-sans">
      {/* PWA Lifecycle Manager (Handle Updates) */}
      <PWALifecycle />

      {showRegistrationModal && (
        <RegistrationModal
            onRegister={handleRegister}
            onSkip={() => {
                setShowRegistrationModal(false);
                setPendingAction(null);
            }}
        />
      )}
      
      {/* Achievement Popup Queue */}
      {notificationQueue.length > 0 && (
          <AchievementPopup 
              key={notificationQueue[0].id}
              title={notificationQueue[0].title}
              description={notificationQueue[0].description}
              onClose={handleDismissNotification}
          />
      )}
      
      {userProfile && (
        <SideMenu
          isOpen={isSideMenuOpen}
          onClose={() => setIsSideMenuOpen(false)}
          userProfile={userProfile}
          userEmail={currentUser?.email}
          onNavigate={(screen) => { handleSetActiveScreen(screen); setIsSideMenuOpen(false); }}
          onLogout={() => handleLogout()}
        />
      )}
      
      <main className="relative h-[100dvh] w-screen overflow-hidden">
        {previousScreen && (
            <div 
                key={previousScreen} 
                className={`absolute inset-0 w-full h-full ${direction === 'right' ? 'animate-slide-out-to-left' : 'animate-slide-out-to-right'}`}
            >
                {renderScreen(previousScreen)}
            </div>
        )}
        <div 
            key={activeScreen} 
            className={`absolute inset-0 w-full h-full ${direction ? (direction === 'right' ? 'animate-slide-in-from-right' : 'animate-slide-in-from-left') : ''}`}
        >
            {renderScreen(activeScreen)}
        </div>
      </main>

      <BottomNav activeScreen={activeScreen} setActiveScreen={handleSetActiveScreen} settings={settings} />
    </div>
  );
};

export default App;