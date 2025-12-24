
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { playSound } from '../services/soundService';
import { generateDilemmaScenarios } from '../services/geminiService';
import { AppSettings } from '../types';
import { BrainIcon, EyeIcon, WindIcon, ArrowLeftIcon, ZapIcon, MessageSquareHeartIcon, SparklesIcon, InfoIcon, X } from '../components/ui/Icons';
import { BrandText } from '../App';

type Game = 'menu' | 'memory' | 'mindfulness' | 'sequence' | 'dilemma';
type Difficulty = 'easy' | 'medium' | 'hard';

type CardType = { id: number; emoji: string; isFlipped: boolean; isMatched: boolean; };
type Choice = { text: string; consequence: string; outcome: 'positive' | 'negative' | 'neutral'; scoreChange: number; };
type Scenario = { id: number; character: string; emotion: string; situation: string; choices: Choice[]; };

type GameState = {
    memory?: { difficulty?: Difficulty; cards?: CardType[]; moves?: number; };
    sequence?: { level: number; score: number; sequence: number[]; };
    mindfulness?: { step: number; inputs: Record<number, string[]>; };
    dilemma?: { scenarios: Scenario[]; currentIndex: number; score: number; };
};

const GAME_PROGRESS_KEY = 'tranquiliGameProgress';
const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(" ");

const BackButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <button onClick={() => { playSound('select'); onClick(); }} className="absolute top-4 left-4 flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors z-10 p-2">
        <ArrowLeftIcon className="w-5 h-5" /> Voltar
    </button>
);

const HelpButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <button onClick={() => { playSound('toggle'); onClick(); }} className="absolute top-4 right-4 p-2 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors z-10">
      <InfoIcon className="w-6 h-6" />
    </button>
);

const HelpModal: React.FC<{ title: string; children: React.ReactNode; onClose: () => void; }> = ({ title, children, onClose }) => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center relative">
        <button onClick={onClose} className="absolute top-2 right-2 p-1 rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"><X className="w-5 h-5" /></button>
        <h3 className="text-xl font-bold text-gray-800 mb-4">{title}</h3>
        <div className="text-gray-600 text-left space-y-2">{children}</div>
      </div>
    </div>
);

const GAME_INSTRUCTIONS = {
  memory: { title: "Jogo da Memória", instructions: "Encontre os pares de emojis. Tente usar o menor número de movimentos possível." },
  sequence: { title: "Neuro-Sequência", instructions: "Repita a sequência de luzes. A cada acerto, ela fica mais longa." },
  mindfulness: { title: "5 Sentidos", instructions: "Ancore-se no presente listando coisas que você vê, toca, ouve, cheira e saboreia." },
  dilemma: { title: "Dilemas Emocionais", instructions: "Tome decisões conscientes em cenários sociais para treinar sua inteligência emocional." }
};

const MEMORY_EMOJIS = ['😊', '😌', '😐', '😢', '😟', '🥳', '🤯', '🤩', '😴', '🤔', '😇', '😂'];
const DIFFICULTY_SETTINGS: Record<Difficulty, { pairs: number; grid: string; cardSize: string; }> = {
    easy:   { pairs: 6,  grid: 'grid-cols-4 gap-3', cardSize: 'w-16 h-16 md:w-20 md:h-20' },
    medium: { pairs: 8,  grid: 'grid-cols-4 gap-3', cardSize: 'w-16 h-16 md:w-20 md:h-20' },
    hard:   { pairs: 10, grid: 'grid-cols-5 gap-2', cardSize: 'w-14 h-14 md:w-16 md:h-16' },
};

const shuffleArray = <T,>(array: T[]): T[] => [...array].sort(() => Math.random() - 0.5);

const generateCards = (pairCount: number): CardType[] => {
  const emojiSubset = shuffleArray(MEMORY_EMOJIS).slice(0, pairCount);
  return shuffleArray([...emojiSubset, ...emojiSubset]).map((emoji, index) => ({
    id: index, emoji, isFlipped: false, isMatched: false,
  }));
};

const MemoryGame: React.FC<{ onBack: () => void; highScores: any; onNewHighScore: (s: any) => void; savedState?: any; onStateChange: (s: any) => void; onShowHelp: () => void; }> = ({ onBack, highScores, onNewHighScore, savedState, onStateChange, onShowHelp }) => {
  const [difficulty, setDifficulty] = useState<Difficulty | null>(savedState?.difficulty ?? null);
  const [cards, setCards] = useState<CardType[]>(savedState?.cards ?? []);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(savedState?.moves ?? 0);
  const [gameOver, setGameOver] = useState(false);

  const startGame = (diff: Difficulty) => {
    playSound('select');
    const newCards = generateCards(DIFFICULTY_SETTINGS[diff].pairs);
    setDifficulty(diff); setCards(newCards); setMoves(0); setFlippedCards([]); setGameOver(false);
    onStateChange({ difficulty: diff, cards: newCards, moves: 0 });
  };
  
  useEffect(() => {
    if (flippedCards.length === 2) {
      const [f, s] = flippedCards;
      if (cards[f].emoji === cards[s].emoji) {
        playSound('match');
        const newCards = cards.map(c => c.emoji === cards[f].emoji ? { ...c, isMatched: true } : c);
        setCards(newCards);
        onStateChange({ difficulty, cards: newCards, moves: moves + 1 });
      } else {
        setTimeout(() => {
            const newCards = cards.map(c => flippedCards.includes(c.id) ? { ...c, isFlipped: false } : c);
            setCards(newCards);
            onStateChange({ difficulty, cards: newCards, moves: moves + 1 });
        }, 1000);
      }
      setFlippedCards([]);
    }
  }, [flippedCards, cards, difficulty, moves, onStateChange]);

  useEffect(() => {
    if (cards.length > 0 && cards.every(c => c.isMatched)) {
      playSound('victory'); setGameOver(true);
      const m = Math.floor(moves / 2);
      if (difficulty && (highScores[difficulty] === null || m < highScores[difficulty])) {
          onNewHighScore({ ...highScores, [difficulty]: m });
      }
      onStateChange(undefined);
    }
  }, [cards, moves, difficulty, highScores, onNewHighScore, onStateChange]);

  if (!difficulty || gameOver) {
      return (
          <div className="w-full text-center relative pt-12 flex flex-col items-center animate-fade-in">
              <BackButton onClick={onBack} /> <HelpButton onClick={onShowHelp} />
              <h1 className="text-3xl font-bold mb-2 text-gray-900">Jogo da Memória</h1>
              {gameOver ? (
                  <div className="bg-white p-6 rounded-xl shadow-lg mt-4 w-full max-w-sm">
                      <h2 className="text-2xl font-bold text-green-500">Vitória!</h2>
                      <p className="my-4 text-gray-700">Movimentos: <span className="font-bold">{Math.floor(moves / 2)}</span></p>
                      <button onClick={() => setDifficulty(null)} className="px-8 py-3 bg-[#ffde59] font-bold rounded-lg text-gray-900 shadow hover:bg-yellow-400 transition-colors">Jogar Novamente</button>
                  </div>
              ) : (
                  <div className="space-y-4 w-full max-w-sm mt-6">
                      {(['easy', 'medium', 'hard'] as Difficulty[]).map(diff => (
                          <button key={diff} onClick={() => startGame(diff)} className="w-full p-4 bg-white rounded-lg shadow-md text-left transition-transform hover:scale-[1.02] border border-gray-100">
                              <h3 className="font-bold capitalize text-gray-800">{diff === 'easy' ? 'Fácil' : diff === 'medium' ? 'Médio' : 'Difícil'}</h3>
                              <p className="text-sm text-gray-500">Recorde: {highScores[diff] ?? '---'}</p>
                          </button>
                      ))}
                  </div>
              )}
          </div>
      );
  }
  return (
    <div className="w-full text-center relative pt-12 animate-fade-in">
       <BackButton onClick={() => { setDifficulty(null); }} /> <HelpButton onClick={onShowHelp} />
       <h1 className="text-3xl font-bold mb-6 text-gray-900">Memória ({difficulty === 'easy' ? 'Fácil' : difficulty === 'medium' ? 'Médio' : 'Difícil'})</h1>
       <div className={`grid mx-auto max-w-md ${DIFFICULTY_SETTINGS[difficulty].grid}`}>
        {cards.map(card => (
          <div key={card.id} className={cn(DIFFICULTY_SETTINGS[difficulty].cardSize, "relative cursor-pointer transition-transform duration-500 [transform-style:preserve-3d]", (card.isFlipped || card.isMatched) && "[transform:rotateY(180deg)]")} onClick={() => { if (!card.isFlipped && !card.isMatched && flippedCards.length < 2) { playSound('flip'); setCards(prev => prev.map(c => c.id === card.id ? {...c, isFlipped: true} : c)); setFlippedCards(p => [...p, card.id]); setMoves(m => m+1); } }}>
              <div className="absolute w-full h-full bg-blue-400 rounded-lg [backface-visibility:hidden]"></div>
              <div className="absolute w-full h-full bg-white rounded-lg flex items-center justify-center text-3xl [backface-visibility:hidden] [transform:rotateY(180deg)] shadow-inner">{card.emoji}</div>
          </div>
        ))}
       </div>
    </div>
  );
};

const SequenceGame: React.FC<{ onBack: () => void; highScore: number; onNewHighScore: (s: number) => void; onShowHelp: () => void; savedState?: any; onStateChange: (s: any) => void; }> = ({ onBack, highScore, onNewHighScore, onShowHelp, savedState, onStateChange }) => {
    const [level, setLevel] = useState(savedState?.level ?? 1);
    const [score, setScore] = useState(savedState?.score ?? 0);
    const [sequence, setSequence] = useState<number[]>(savedState?.sequence ?? []);
    const [playerSequence, setPlayerSequence] = useState<number[]>([]);
    const [gameState, setGameState] = useState<'idle' | 'showing' | 'playing' | 'gameOver'>('idle');
    const [activeTile, setActiveTile] = useState<number | null>(null);

    const startNextLevel = useCallback((currentSeq: number[]) => {
        setPlayerSequence([]); setGameState('showing');
        const next = [...currentSeq, Math.floor(Math.random() * 9)];
        setSequence(next);
        onStateChange({ level, score, sequence: next });
    }, [level, score, onStateChange]);

    useEffect(() => {
        if (gameState !== 'showing' || sequence.length === 0) return;
        let i = 0;
        const interval = setInterval(() => {
            playSound('click'); setActiveTile(sequence[i]);
            setTimeout(() => setActiveTile(null), 300);
            i++;
            if (i >= sequence.length) { clearInterval(interval); setTimeout(() => setGameState('playing'), 400); }
        }, 600);
        return () => clearInterval(interval);
    }, [gameState, sequence]);

    const handleTileClick = (idx: number) => {
        if (gameState !== 'playing') return;
        setActiveTile(idx); setTimeout(() => setActiveTile(null), 150);
        const nextPlayerSeq = [...playerSequence, idx];
        if (sequence[nextPlayerSeq.length - 1] !== idx) {
            playSound('error'); setGameState('gameOver');
            if (score > highScore) onNewHighScore(score);
            onStateChange(undefined);
            return;
        }
        playSound('click'); setPlayerSequence(nextPlayerSeq);
        if (nextPlayerSeq.length === sequence.length) {
            playSound('confirm'); 
            const newScore = score + sequence.length * 10;
            const nextLevel = level + 1;
            setScore(newScore); setLevel(nextLevel);
            setTimeout(() => { startNextLevel(sequence); }, 800);
        }
    };

    if (gameState === 'idle' || gameState === 'gameOver') {
        return (
            <div className="w-full text-center pt-12 flex flex-col items-center animate-fade-in">
                <BackButton onClick={onBack} /> <HelpButton onClick={onShowHelp} />
                <h1 className="text-3xl font-bold mb-6 text-gray-900">{gameState === 'gameOver' ? 'Fim de Jogo' : 'Sequência'}</h1>
                <p className="mb-4 text-gray-700">Seu Recorde: <span className="font-bold">{highScore}</span></p>
                {gameState === 'gameOver' && <p className="mb-6 text-xl font-medium text-gray-800">Sua Pontuação: {score}</p>}
                <button onClick={() => { setLevel(1); setScore(0); startNextLevel([]); }} className="px-8 py-3 bg-[#38b6ff] text-white font-bold rounded-lg shadow-lg hover:bg-blue-500 transition-colors">{savedState && gameState !== 'gameOver' ? 'Continuar' : 'Começar'}</button>
            </div>
        );
    }
    return (
        <div className="w-full text-center pt-12 flex flex-col items-center animate-fade-in">
            <BackButton onClick={onBack} /> <HelpButton onClick={onShowHelp} />
            <h1 className="text-2xl font-bold mb-4 text-gray-900">Nível {level} | Pontos: {score}</h1>
            <div className="grid grid-cols-3 gap-3 p-3 bg-white rounded-2xl shadow-md border border-gray-100">
                {Array.from({ length: 9 }).map((_, i) => (
                    <button key={i} onClick={() => handleTileClick(i)} className={cn("w-20 h-20 rounded-xl transition-all", activeTile === i ? 'bg-yellow-300 scale-105 shadow-lg' : 'bg-gray-100 hover:bg-gray-200')} />
                ))}
            </div>
        </div>
    );
};

const MindfulnessGame: React.FC<{ onBack: () => void; onShowHelp: () => void; savedState?: any; onStateChange: (s: any) => void; }> = ({ onBack, onShowHelp, savedState, onStateChange }) => {
    const STEPS = [
        { count: 5, label: "coisas que você vê", emoji: "👁️" },
        { count: 4, label: "coisas que você pode tocar", emoji: "✋" },
        { count: 3, label: "coisas que você ouve", emoji: "👂" },
        { count: 2, label: "coisas que você sente o cheiro", emoji: "👃" },
        { count: 1, label: "coisa que você pode saborear", emoji: "👅" }
    ];

    const [currentStep, setCurrentStep] = useState(savedState?.step ?? 0);
    const [inputs, setInputs] = useState<string[]>(Array(STEPS[currentStep]?.count || 0).fill(''));
    const [done, setDone] = useState(false);

    const handleInputChange = (idx: number, val: string) => {
        const newInputs = [...inputs];
        newInputs[idx] = val;
        setInputs(newInputs);
    };

    const next = () => {
        playSound('confirm');
        if (currentStep < STEPS.length - 1) {
            const nextStep = currentStep + 1;
            setCurrentStep(nextStep);
            setInputs(Array(STEPS[nextStep].count).fill(''));
            onStateChange({ step: nextStep });
        } else {
            setDone(true);
            onStateChange(undefined);
            playSound('victory');
        }
    };

    if (done) {
        return (
            <div className="w-full text-center pt-12 flex flex-col items-center animate-fade-in">
                <BackButton onClick={onBack} />
                <h1 className="text-3xl font-bold mb-6 text-gray-900">Ancorado!</h1>
                <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 mb-6">
                    <p className="text-lg text-gray-700">Você agora está mais presente e calmo.</p>
                </div>
                <button onClick={onBack} className="px-8 py-3 bg-[#38b6ff] text-white font-bold rounded-lg shadow-md">Finalizar</button>
            </div>
        );
    }

    const s = STEPS[currentStep];
    return (
        <div className="w-full text-center pt-12 flex flex-col items-center max-w-md mx-auto animate-fade-in">
            <BackButton onClick={onBack} /> <HelpButton onClick={onShowHelp} />
            <span className="text-6xl mb-4">{s.emoji}</span>
            <h2 className="text-2xl font-bold mb-2 text-gray-900">Observe {s.count} {s.label}</h2>
            <p className="text-gray-500 mb-6 italic">Digite ou apenas pense neles enquanto respira fundo.</p>
            <div className="w-full space-y-3 mb-8">
                {inputs.map((val, i) => (
                    <input key={i} value={val} onChange={(e) => handleInputChange(i, e.target.value)} placeholder={`Item ${i+1}`} className="w-full p-3 bg-white rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#38b6ff] outline-none shadow-sm" />
                ))}
            </div>
            <button onClick={next} className="px-8 py-3 bg-[#38b6ff] text-white font-bold rounded-lg shadow-lg">Próximo</button>
        </div>
    );
};

const EmotionalDilemmaGame: React.FC<{ onBack: () => void; highScore: number; onNewHighScore: (s: number) => void; onShowHelp: () => void; savedState?: any; onStateChange: (s: any) => void; }> = ({ onBack, highScore, onNewHighScore, onShowHelp, savedState, onStateChange }) => {
    const [gameState, setGameState] = useState<'idle' | 'playing' | 'feedback' | 'end'>(savedState ? 'playing' : 'idle');
    const [currentScenarioIndex, setCurrentScenarioIndex] = useState(savedState?.currentIndex ?? 0);
    const [activeScenarios, setActiveScenarios] = useState<Scenario[]>(savedState?.scenarios ?? []);
    const [score, setScore] = useState(savedState?.score ?? 50);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = async () => {
        setIsGenerating(true); playSound('send');
        try {
            const data = await generateDilemmaScenarios();
            setActiveScenarios(data); setCurrentScenarioIndex(0); setScore(50); setFeedback(null); setGameState('playing');
            onStateChange({ scenarios: data, currentIndex: 0, score: 50 });
        } catch (e) { playSound('error'); } finally { setIsGenerating(false); }
    };

    const handleChoice = (c: Choice) => {
        if (gameState !== 'playing') return;
        playSound(c.outcome === 'positive' ? 'confirm' : c.outcome === 'negative' ? 'error' : 'select');
        const newScore = Math.max(0, Math.min(100, score + c.scoreChange));
        setScore(newScore); setFeedback(c.consequence); setGameState('feedback');
        
        setTimeout(() => {
            if (currentScenarioIndex < activeScenarios.length - 1) {
                const nextIdx = currentScenarioIndex + 1;
                setCurrentScenarioIndex(nextIdx); setFeedback(null); setGameState('playing');
                onStateChange({ scenarios: activeScenarios, currentIndex: nextIdx, score: newScore });
            } else {
                setGameState('end'); if (newScore > highScore) onNewHighScore(newScore);
                onStateChange(undefined);
            }
        }, 3000);
    };

    if (gameState === 'idle' || gameState === 'end') {
        return (
            <div className="w-full text-center pt-12 flex flex-col items-center animate-fade-in">
                <BackButton onClick={onBack} /> <HelpButton onClick={onShowHelp} />
                <h1 className="text-3xl font-bold mb-6 text-gray-900">Dilemas Emocionais</h1>
                {gameState === 'end' && <div className="mb-6 bg-white p-6 rounded-xl shadow-lg w-full max-w-sm border border-gray-100"><h2 className="text-xl font-bold mb-2 text-gray-800">Treino Concluído!</h2><p className="text-3xl font-bold text-blue-500">{score}</p></div>}
                <button onClick={handleGenerate} disabled={isGenerating} className="px-8 py-3 bg-gradient-to-r from-[#38b6ff] to-blue-400 text-white font-bold rounded-lg shadow-lg flex items-center gap-2 hover:opacity-90 transition-opacity">
                    {isGenerating ? "Gerando 5 dilemas..." : <><SparklesIcon className="w-5 h-5" /> {savedState ? 'Reiniciar Jornada' : 'Começar Jornada'}</>}
                </button>
            </div>
        );
    }
    const s = activeScenarios[currentScenarioIndex];
    if (!s) return null;
    return (
        <div className="w-full text-center pt-12 flex flex-col items-center max-w-md mx-auto animate-fade-in">
            <BackButton onClick={() => { onStateChange(undefined); setGameState('idle'); }} /> <HelpButton onClick={onShowHelp} />
            <h2 className="text-xl font-bold mb-4 text-[#38b6ff]">Cenário {currentScenarioIndex + 1}/{activeScenarios.length}</h2>
            <div className="w-full bg-white rounded-xl shadow-lg p-6 mb-6 relative min-h-[12rem] flex flex-col justify-center border border-gray-100">
                {gameState === 'feedback' && feedback ? (
                    <div className="absolute inset-0 bg-white/95 rounded-xl flex items-center justify-center p-6 font-bold text-[#38b6ff] animate-fade-in text-lg">
                        {feedback}
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-5xl">{s.emotion}</span>
                            <div className="text-left">
                                <p className="text-[10px] font-bold text-[#38b6ff] uppercase tracking-widest mb-0.5">Personagem</p>
                                <p className="text-lg font-bold text-gray-800 leading-tight">{s.character}</p>
                            </div>
                        </div>
                        <p className="text-gray-700 leading-relaxed font-medium text-left">
                            <BrandText text={s.situation} />
                        </p>
                    </>
                )}
            </div>
            <div className="w-full space-y-3">
                {s.choices.map((c, i) => (
                    <button key={i} onClick={() => handleChoice(c)} disabled={gameState === 'feedback'} className="w-full text-left p-4 bg-white rounded-xl shadow-md hover:border-[#38b6ff] border-2 border-transparent transition-all text-gray-700 font-medium active:scale-[0.98]">{c.text}</button>
                ))}
            </div>
        </div>
    );
};

const GamesScreen: React.FC<{ handleProtectedAction: (a: () => void) => void; settings: AppSettings; setSettings: (s: AppSettings) => void; }> = ({ handleProtectedAction, settings, setSettings }) => {
  const [activeScreen, setActiveScreen] = useState<Game>('menu');
  const [helpContent, setHelpContent] = useState<any>(null);
  const [localGameState, setLocalGameState] = useState<GameState>(() => {
      const saved = localStorage.getItem(GAME_PROGRESS_KEY);
      return saved ? JSON.parse(saved) : {};
  });

  const highScores = settings.highScores || { memory: { easy: null, medium: null, hard: null }, sequence: 0, dilemma: 0 };

  useEffect(() => { localStorage.setItem(GAME_PROGRESS_KEY, JSON.stringify(localGameState)); }, [localGameState]);

  const updateHighScore = (game: 'sequence' | 'dilemma' | 'memory', val: any) => {
      const newScores = { ...highScores, [game]: val };
      setSettings({ ...settings, highScores: newScores });
  };

  const handleStateUpdate = (game: keyof GameState, state: any) => {
      setLocalGameState(prev => ({ ...prev, [game]: state }));
  };

  const renderGame = () => {
      switch (activeScreen) {
          case 'memory': return <MemoryGame onBack={() => setActiveScreen('menu')} highScores={highScores.memory} onNewHighScore={(s) => updateHighScore('memory', s)} savedState={localGameState.memory} onStateChange={(s) => handleStateUpdate('memory', s)} onShowHelp={() => setHelpContent(GAME_INSTRUCTIONS.memory)} />;
          case 'sequence': return <SequenceGame onBack={() => setActiveScreen('menu')} highScore={highScores.sequence} onNewHighScore={(s) => updateHighScore('sequence', s)} onShowHelp={() => setHelpContent(GAME_INSTRUCTIONS.sequence)} savedState={localGameState.sequence} onStateChange={(s) => handleStateUpdate('sequence', s)} />;
          case 'mindfulness': return <MindfulnessGame onBack={() => setActiveScreen('menu')} onShowHelp={() => setHelpContent(GAME_INSTRUCTIONS.mindfulness)} savedState={localGameState.mindfulness} onStateChange={(s) => handleStateUpdate('mindfulness', s)} />;
          case 'dilemma': return <EmotionalDilemmaGame onBack={() => setActiveScreen('menu')} highScore={highScores.dilemma} onNewHighScore={(s) => updateHighScore('dilemma', s)} onShowHelp={() => setHelpContent(GAME_INSTRUCTIONS.dilemma)} savedState={localGameState.dilemma} onStateChange={(s) => handleStateUpdate('dilemma', s)} />;
          default: return (
              <div className="w-full animate-fade-in">
                  <h1 className="text-3xl font-bold mb-6 text-gray-900">Games Mentais <span className="text-[#ffde59]">+</span></h1>
                  <div className="space-y-4">
                      {[
                          { id: 'dilemma', t: 'Dilemas Emocionais', d: 'Melhore sua inteligência emocional.', i: <MessageSquareHeartIcon className="text-blue-500" />, resume: !!localGameState.dilemma },
                          { id: 'mindfulness', t: '5 Sentidos', d: 'Exercício rápido de mindfulness.', i: <WindIcon className="text-blue-500" />, resume: !!localGameState.mindfulness },
                          { id: 'memory', t: 'Jogo da Memória', d: 'Encontre os pares de emojis.', i: <BrainIcon className="text-blue-500" />, resume: !!localGameState.memory },
                          { id: 'sequence', t: 'Neuro-Sequência', d: 'Repita padrões complexos.', i: <ZapIcon className="text-blue-500" />, resume: !!localGameState.sequence }
                      ].map(g => (
                          <div key={g.id} onClick={() => handleProtectedAction(() => { playSound('navigation'); setActiveScreen(g.id as Game); })} className="bg-white p-6 rounded-2xl shadow-lg cursor-pointer transition-transform hover:-translate-y-1 hover:shadow-xl border border-gray-100 relative overflow-hidden group">
                              {g.resume && <div className="absolute top-2 right-2 bg-yellow-100 text-yellow-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse border border-yellow-200">Em progresso</div>}
                              <div className="flex items-center gap-4">
                                  <div className="bg-blue-50 p-4 rounded-2xl group-hover:bg-blue-100 transition-colors">{g.i}</div>
                                  <div><h3 className="text-xl font-bold text-gray-800">{g.t}</h3><p className="text-gray-500 text-sm">{g.d}</p></div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          );
      }
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50 scroll-smooth">
       {helpContent && <HelpModal title={helpContent.title} onClose={() => setHelpContent(null)}>{helpContent.instructions}</HelpModal>}
       <div className="w-full p-4 pt-8 pb-36 max-w-2xl mx-auto flex flex-col items-center">
            {renderGame()}
       </div>
    </div>
  );
};

export default GamesScreen;
