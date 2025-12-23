
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { playSound } from '../services/soundService';
import { generateDilemmaScenarios } from '../services/geminiService';
import { AppSettings } from '../types';
import { BrainIcon, EyeIcon, WindIcon, ArrowLeftIcon, ZapIcon, MessageSquareHeartIcon, SparklesIcon, InfoIcon, X } from '../components/ui/Icons';

type Game = 'menu' | 'memory' | 'mindfulness' | 'sequence' | 'dilemma';
type Difficulty = 'easy' | 'medium' | 'hard';

type CardType = { id: number; emoji: string; isFlipped: boolean; isMatched: boolean; };
type Choice = { text: string; consequence: string; outcome: 'positive' | 'negative' | 'neutral'; scoreChange: number; };
type Scenario = { id: number; character: string; emotion: string; situation: string; choices: Choice[]; };

type GameState = {
    memory?: { difficulty?: Difficulty; cards?: CardType[]; moves?: number; };
    mindfulness?: { step: number; inputs: Record<number, string[]>; };
};

const GAME_PROGRESS_KEY = 'tranquiliGameProgress';
const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(" ");

const BackButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <button onClick={() => { playSound('select'); onClick(); }} className="absolute top-4 left-4 flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors z-10">
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

const shuffleArray = <T,>(array: T[]): T[] => array.sort(() => Math.random() - 0.5);

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
        setCards(prev => prev.map(c => c.emoji === cards[f].emoji ? { ...c, isMatched: true } : c));
      } else {
        setTimeout(() => setCards(prev => prev.map(c => flippedCards.includes(c.id) ? { ...c, isFlipped: false } : c)), 1000);
      }
      setFlippedCards([]);
    }
  }, [flippedCards, cards]);

  useEffect(() => {
    if (cards.length > 0 && cards.every(c => c.isMatched)) {
      playSound('victory'); setGameOver(true);
      const m = Math.floor(moves / 2);
      if (difficulty && (highScores[difficulty] === null || m < highScores[difficulty])) {
          onNewHighScore({ ...highScores, [difficulty]: m });
      }
    }
  }, [cards, moves, difficulty, highScores, onNewHighScore]);

  if (!difficulty || gameOver) {
      return (
          <div className="w-full text-center relative pt-12 flex flex-col items-center">
              <BackButton onClick={onBack} /> <HelpButton onClick={onShowHelp} />
              <h1 className="text-3xl font-bold mb-2">Jogo da Memória</h1>
              {gameOver ? (
                  <div className="bg-white p-6 rounded-xl shadow-lg mt-4 w-full max-w-sm">
                      <h2 className="text-2xl font-bold text-green-500">Vitória!</h2>
                      <p className="my-4">Movimentos: <span className="font-bold">{Math.floor(moves / 2)}</span></p>
                      <button onClick={() => setDifficulty(null)} className="px-8 py-3 bg-[#ffde59] font-bold rounded-lg">Jogar Novamente</button>
                  </div>
              ) : (
                  <div className="space-y-4 w-full max-w-sm mt-6">
                      {(['easy', 'medium', 'hard'] as Difficulty[]).map(diff => (
                          <button key={diff} onClick={() => startGame(diff)} className="w-full p-4 bg-white rounded-lg shadow-md text-left transition-transform hover:scale-105">
                              <h3 className="font-bold capitalize">{diff}</h3>
                              <p className="text-sm text-gray-500">Recorde: {highScores[diff] ?? '---'}</p>
                          </button>
                      ))}
                  </div>
              )}
          </div>
      );
  }
  return (
    <div className="w-full text-center relative pt-12">
       <BackButton onClick={() => setDifficulty(null)} /> <HelpButton onClick={onShowHelp} />
       <h1 className="text-3xl font-bold mb-6">Memória ({difficulty})</h1>
       <div className={`grid mx-auto max-w-md ${DIFFICULTY_SETTINGS[difficulty].grid}`}>
        {cards.map(card => (
          <div key={card.id} className={cn(DIFFICULTY_SETTINGS[difficulty].cardSize, "relative cursor-pointer transition-transform duration-500 [transform-style:preserve-3d]", (card.isFlipped || card.isMatched) && "[transform:rotateY(180deg)]")} onClick={() => { if (!card.isFlipped && !card.isMatched && flippedCards.length < 2) { playSound('flip'); setCards(prev => prev.map(c => c.id === card.id ? {...c, isFlipped: true} : c)); setFlippedCards(p => [...p, card.id]); setMoves(m => m+1); } }}>
              <div className="absolute w-full h-full bg-blue-400 rounded-lg [backface-visibility:hidden]"></div>
              <div className="absolute w-full h-full bg-white rounded-lg flex items-center justify-center text-3xl [backface-visibility:hidden] [transform:rotateY(180deg)]">{card.emoji}</div>
          </div>
        ))}
       </div>
    </div>
  );
};

const SequenceGame: React.FC<{ onBack: () => void; highScore: number; onNewHighScore: (s: number) => void; onShowHelp: () => void; }> = ({ onBack, highScore, onNewHighScore, onShowHelp }) => {
    const [level, setLevel] = useState(1);
    const [score, setScore] = useState(0);
    const [sequence, setSequence] = useState<number[]>([]);
    const [playerSequence, setPlayerSequence] = useState<number[]>([]);
    const [gameState, setGameState] = useState<'idle' | 'showing' | 'playing' | 'gameOver'>('idle');
    const [activeTile, setActiveTile] = useState<number | null>(null);

    const startNextLevel = useCallback((currentSeq: number[]) => {
        setPlayerSequence([]); setGameState('showing');
        const next = [...currentSeq, Math.floor(Math.random() * 9)];
        setSequence(next);
    }, []);

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
            return;
        }
        playSound('click'); setPlayerSequence(nextPlayerSeq);
        if (nextPlayerSeq.length === sequence.length) {
            playSound('confirm'); setScore(s => s + sequence.length * 10);
            setTimeout(() => { setLevel(l => l+1); startNextLevel(sequence); }, 800);
        }
    };

    if (gameState === 'idle' || gameState === 'gameOver') {
        return (
            <div className="w-full text-center pt-12 flex flex-col items-center">
                <BackButton onClick={onBack} /> <HelpButton onClick={onShowHelp} />
                <h1 className="text-3xl font-bold mb-6">{gameState === 'gameOver' ? 'Fim de Jogo' : 'Sequência'}</h1>
                <p className="mb-4">Seu Recorde: <span className="font-bold">{highScore}</span></p>
                {gameState === 'gameOver' && <p className="mb-6 text-xl">Sua Pontuação: {score}</p>}
                <button onClick={() => { setLevel(1); setScore(0); startNextLevel([]); }} className="px-8 py-3 bg-[#38b6ff] text-white font-bold rounded-lg shadow-lg">Começar</button>
            </div>
        );
    }
    return (
        <div className="w-full text-center pt-12 flex flex-col items-center">
            <BackButton onClick={onBack} /> <HelpButton onClick={onShowHelp} />
            <h1 className="text-2xl font-bold mb-4">Nível {level} | Pontos: {score}</h1>
            <div className="grid grid-cols-3 gap-3 p-2 bg-white rounded-2xl shadow-md">
                {Array.from({ length: 9 }).map((_, i) => (
                    <button key={i} onClick={() => handleTileClick(i)} className={cn("w-20 h-20 rounded-lg transition-all", activeTile === i ? 'bg-yellow-300 scale-105' : 'bg-gray-200')} />
                ))}
            </div>
        </div>
    );
};

const EmotionalDilemmaGame: React.FC<{ onBack: () => void; highScore: number; onNewHighScore: (s: number) => void; onShowHelp: () => void; }> = ({ onBack, highScore, onNewHighScore, onShowHelp }) => {
    const [gameState, setGameState] = useState<'idle' | 'playing' | 'feedback' | 'end'>('idle');
    const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0);
    const [activeScenarios, setActiveScenarios] = useState<Scenario[]>([]);
    const [score, setScore] = useState(50);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = async () => {
        setIsGenerating(true); playSound('send');
        try {
            const data = await generateDilemmaScenarios();
            setActiveScenarios(data); setCurrentScenarioIndex(0); setScore(50); setFeedback(null); setGameState('playing');
        } catch (e) { playSound('error'); } finally { setIsGenerating(false); }
    };

    const handleChoice = (c: Choice) => {
        if (gameState !== 'playing') return;
        playSound(c.outcome === 'positive' ? 'confirm' : c.outcome === 'negative' ? 'error' : 'select');
        setScore(prev => Math.max(0, Math.min(100, prev + c.scoreChange)));
        setFeedback(c.consequence); setGameState('feedback');
        setTimeout(() => {
            if (currentScenarioIndex < activeScenarios.length - 1) {
                setCurrentScenarioIndex(i => i + 1); setFeedback(null); setGameState('playing');
            } else {
                setGameState('end'); if (score > highScore) onNewHighScore(score);
            }
        }, 3000);
    };

    if (gameState === 'idle' || gameState === 'end') {
        return (
            <div className="w-full text-center pt-12 flex flex-col items-center">
                <BackButton onClick={onBack} /> <HelpButton onClick={onShowHelp} />
                <h1 className="text-3xl font-bold mb-6">Dilemas Emocionais</h1>
                {gameState === 'end' && <div className="mb-6 bg-white p-6 rounded-xl shadow-lg w-full max-w-sm"><h2 className="text-xl font-bold mb-2">Treino Concluído!</h2><p className="text-3xl font-bold text-blue-500">{score}</p></div>}
                <button onClick={handleGenerate} disabled={isGenerating} className="px-8 py-3 bg-gradient-to-r from-[#38b6ff] to-blue-400 text-white font-bold rounded-lg shadow-lg flex items-center gap-2">
                    {isGenerating ? "Gerando 4 dilemas..." : <><SparklesIcon className="w-5 h-5" /> Começar Jornada</>}
                </button>
            </div>
        );
    }
    const s = activeScenarios[currentScenarioIndex];
    return (
        <div className="w-full text-center pt-12 flex flex-col items-center max-w-md mx-auto">
            <BackButton onClick={() => setGameState('idle')} /> <HelpButton onClick={onShowHelp} />
            <h2 className="text-xl font-bold mb-4">Cenário {currentScenarioIndex + 1}/4</h2>
            <div className="w-full bg-white rounded-xl shadow-lg p-6 mb-6 relative min-h-[10rem] flex flex-col justify-center">
                {gameState === 'feedback' && feedback ? <div className="absolute inset-0 bg-white/95 flex items-center justify-center p-4 font-bold text-blue-600 animate-fade-in">{feedback}</div> : <><span className="text-5xl mb-2">{s.emotion}</span><p>{s.situation}</p></>}
            </div>
            <div className="w-full space-y-3">
                {s.choices.map((c, i) => (
                    <button key={i} onClick={() => handleChoice(c)} disabled={gameState === 'feedback'} className="w-full text-left p-4 bg-white rounded-lg shadow-md hover:border-blue-400 border-2 border-transparent transition-all">{c.text}</button>
                ))}
            </div>
        </div>
    );
};

const GamesScreen: React.FC<{ handleProtectedAction: (a: () => void) => void; settings: AppSettings; setSettings: (s: AppSettings) => void; }> = ({ handleProtectedAction, settings, setSettings }) => {
  const [activeScreen, setActiveScreen] = useState<Game>('menu');
  const [direction, setDirection] = useState<'left' | 'right' | null>(null);
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

  const renderGame = () => {
      switch (activeScreen) {
          case 'memory': return <MemoryGame onBack={() => setActiveScreen('menu')} highScores={highScores.memory} onNewHighScore={(s) => updateHighScore('memory', s)} savedState={localGameState.memory} onStateChange={(s) => setLocalGameState(p => ({...p, memory: s}))} onShowHelp={() => setHelpContent(GAME_INSTRUCTIONS.memory)} />;
          case 'sequence': return <SequenceGame onBack={() => setActiveScreen('menu')} highScore={highScores.sequence} onNewHighScore={(s) => updateHighScore('sequence', s)} onShowHelp={() => setHelpContent(GAME_INSTRUCTIONS.sequence)} />;
          case 'dilemma': return <EmotionalDilemmaGame onBack={() => setActiveScreen('menu')} highScore={highScores.dilemma} onNewHighScore={(s) => updateHighScore('dilemma', s)} onShowHelp={() => setHelpContent(GAME_INSTRUCTIONS.dilemma)} />;
          default: return (
              <div className="w-full">
                  <h1 className="text-3xl font-bold mb-6">Games Mentais</h1>
                  <div className="space-y-4">
                      {[
                          { id: 'dilemma', t: 'Dilemas Emocionais', d: 'Melhore sua inteligência emocional.', i: <MessageSquareHeartIcon className="text-blue-500" /> },
                          { id: 'memory', t: 'Jogo da Memória', d: 'Encontre os pares de emojis.', i: <BrainIcon className="text-blue-500" /> },
                          { id: 'sequence', t: 'Neuro-Sequência', d: 'Repita padrões complexos.', i: <ZapIcon className="text-blue-500" /> }
                      ].map(g => (
                          <div key={g.id} onClick={() => handleProtectedAction(() => { playSound('navigation'); setActiveScreen(g.id as Game); })} className="bg-white p-6 rounded-2xl shadow-lg cursor-pointer transition-transform hover:-translate-y-1">
                              <div className="flex items-center gap-4">
                                  <div className="bg-blue-100 p-3 rounded-full">{g.i}</div>
                                  <div><h3 className="text-xl font-bold">{g.t}</h3><p className="text-gray-500">{g.d}</p></div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          );
      }
  };

  return (
    <div className="p-4 pb-28 bg-gray-50 h-full overflow-y-auto flex flex-col items-center relative">
       {helpContent && <HelpModal title={helpContent.title} onClose={() => setHelpContent(null)}>{helpContent.instructions}</HelpModal>}
       <div className="w-full min-h-full flex flex-col items-center">{renderGame()}</div>
    </div>
  );
};

export default GamesScreen;
