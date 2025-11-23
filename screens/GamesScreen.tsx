import React, { useState, useEffect, useCallback, useRef } from 'react';
import { playSound } from '../services/soundService';
import { generateDilemmaScenario } from '../services/geminiService';
import { BrainIcon, EyeIcon, WindIcon, ArrowLeftIcon, ZapIcon, MessageSquareHeartIcon, SparklesIcon, InfoIcon, X } from '../components/ui/Icons';

type Game = 'menu' | 'memory' | 'mindfulness' | 'sequence' | 'dilemma';
type Difficulty = 'easy' | 'medium' | 'hard';

// --- Types for Game State ---
type CardType = {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
};

type Choice = {
    text: string;
    consequence: string;
    outcome: 'positive' | 'negative' | 'neutral';
    scoreChange: number;
};

type Scenario = {
    id: number;
    character: string;
    emotion: string;
    situation: string;
    choices: Choice[];
};

type GameState = {
    memory?: {
        // progress if a game is active
        difficulty?: Difficulty;
        cards?: CardType[];
        moves?: number;
        // high scores are persistent
        highScores: {
            easy: number | null;
            medium: number | null;

            hard: number | null;
        };
    };
    sequence?: {
        highScore: number;
    };
    mindfulness?: {
        step: number;
        inputs: Record<number, string[]>;
    };
    dilemma?: {
        highScore: number;
    };
};

const GAME_PROGRESS_KEY = 'tranquiliGameProgress';


// --- Utility function for className merging ---
const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(" ");

// --- UI Components ---
const BackButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <button
        onClick={() => { playSound('select'); onClick(); }}
        className="absolute top-4 left-4 flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors z-10"
    >
        <ArrowLeftIcon className="w-5 h-5" />
        Voltar
    </button>
);

const HelpButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <button
      onClick={() => { playSound('toggle'); onClick(); }}
      className="absolute top-4 right-4 p-2 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors z-10"
      aria-label="Ajuda"
    >
      <InfoIcon className="w-6 h-6" />
    </button>
);

interface HelpModalProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}
const HelpModal: React.FC<HelpModalProps> = ({ title, children, onClose }) => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center relative">
        <button onClick={onClose} className="absolute top-2 right-2 p-1 rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors">
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-xl font-bold text-gray-800 mb-4">{title}</h3>
        <div className="text-gray-600 text-left space-y-2">{children}</div>
      </div>
    </div>
);

// --- Game Instructions ---
const GAME_INSTRUCTIONS = {
  memory: {
    title: "Como Jogar: Jogo da Memória",
    instructions: (
      <>
        <p><strong>Objetivo:</strong> Encontre todos os pares de emojis no menor número de movimentos possível.</p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>Escolha um nível de dificuldade para começar.</li>
          <li>Clique em duas cartas para virá-las.</li>
          <li>Se os emojis forem iguais, é um par! Elas permanecerão viradas.</li>
          <li>Se forem diferentes, elas virarão de volta. Tente memorizar suas posições.</li>
          <li>O jogo termina quando todos os pares forem encontrados. Boa sorte!</li>
        </ul>
      </>
    ),
  },
  sequence: {
    title: "Como Jogar: Neuro-Sequência",
    instructions: (
      <>
        <p><strong>Objetivo:</strong> Teste sua memória de trabalho repetindo a sequência de luzes que fica progressivamente <span className="text-[#ffde59]">+</span> longa.</p>
        <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Observe a sequência de quadrados que se iluminam.</li>
            <li>Quando for a sua vez, clique nos quadrados na mesma ordem.</li>
            <li>A cada rodada correta, a sequência aumenta em um passo.</li>
            <li>O jogo termina se você errar a sequência. Tente bater seu recorde!</li>
        </ul>
      </>
    ),
  },
  mindfulness: {
    title: "Como Jogar: Exercício dos 5 Sentidos",
    instructions: (
       <>
        <p><strong>Objetivo:</strong> Ancorar sua atenção no momento presente, usando seus cinco sentidos para se conectar com o ambiente ao seu redor.</p>
        <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Siga as instruções na tela, uma para cada sentido.</li>
            <li>Para cada sentido, observe seu ambiente e liste o que você percebe nos campos de texto.</li>
            <li>Não há pressa. Respire fundo e observe com calma.</li>
            <li>Complete todos os passos para finalizar o exercício e se sentir <span className="text-[#ffde59]">+</span> presente.</li>
        </ul>
       </>
    ),
  },
  dilemma: {
    title: "Como Jogar: Dilemas Emocionais",
    instructions: (
      <>
        <p><strong>Objetivo:</strong> Aprimorar sua inteligência emocional navegando por cenários sociais e tomando decisões conscientes.</p>
        <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Leia a situação apresentada.</li>
            <li>Escolha uma das opções que melhor representa como você reagiria.</li>
            <li>Observe a consequência da sua escolha e como ela afeta sua pontuação.</li>
            <li>Não há respostas "certas" ou "erradas", apenas oportunidades para aprender e refletir.</li>
        </ul>
      </>
    ),
  }
};


// --- Game: Memory ---
const MEMORY_EMOJIS = ['😊', '😌', '😐', '😢', '😟', '🥳', '🤯', '🤩', '😴', '🤔', '😇', '😂'];

const DIFFICULTY_SETTINGS: Record<Difficulty, { pairs: number; grid: string; cardSize: string; }> = {
    easy:   { pairs: 6,  grid: 'grid-cols-4 gap-3', cardSize: 'w-16 h-16 md:w-20 md:h-20' },
    medium: { pairs: 8,  grid: 'grid-cols-4 gap-3', cardSize: 'w-16 h-16 md:w-20 md:h-20' },
    hard:   { pairs: 10, grid: 'grid-cols-5 gap-2', cardSize: 'w-14 h-14 md:w-16 md:h-16' },
};

const shuffleArray = <T,>(array: T[]): T[] => {
  return array.sort(() => Math.random() - 0.5);
};

const generateCards = (pairCount: number): CardType[] => {
  const emojiSubset = shuffleArray(MEMORY_EMOJIS).slice(0, pairCount);
  const gameEmojis = [...emojiSubset, ...emojiSubset];
  const shuffledEmojis = shuffleArray(gameEmojis);

  return shuffledEmojis.map((emoji, index) => ({
    id: index,
    emoji,
    isFlipped: false,
    isMatched: false,
  }));
};

interface MemoryGameProps {
  onBack: () => void;
  savedState?: GameState['memory'];
  onStateChange: (state: GameState['memory'] | undefined) => void;
  onShowHelp: () => void;
}

const MemoryGame: React.FC<MemoryGameProps> = ({ onBack, savedState, onStateChange, onShowHelp }) => {
  const [difficulty, setDifficulty] = useState<Difficulty | null>(savedState?.difficulty ?? null);
  const [cards, setCards] = useState<CardType[]>(savedState?.cards ?? []);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(savedState?.moves ?? 0);
  const [gameOver, setGameOver] = useState(false);
  const [justMatchedEmoji, setJustMatchedEmoji] = useState<string | null>(null);

  const highScores = savedState?.highScores ?? { easy: null, medium: null, hard: null };
  
  const startGame = (diff: Difficulty) => {
    playSound('select');
    const settings = DIFFICULTY_SETTINGS[diff];
    const newCards = generateCards(settings.pairs);
    
    setDifficulty(diff);
    setCards(newCards);
    setMoves(0);
    setFlippedCards([]);
    setGameOver(false);

    onStateChange({
        highScores,
        difficulty: diff,
        cards: newCards,
        moves: 0
    });
  };
  
  useEffect(() => {
    if (difficulty && !gameOver) {
        onStateChange({ highScores, difficulty, cards, moves });
    }
  }, [cards, moves, difficulty, gameOver, highScores, onStateChange]);

  useEffect(() => {
    if (flippedCards.length === 2) {
      const [firstId, secondId] = flippedCards;
      const firstCard = cards.find(c => c.id === firstId);
      const secondCard = cards.find(c => c.id === secondId);

      if (firstCard && secondCard && firstCard.emoji === secondCard.emoji) {
        playSound('match');
        setJustMatchedEmoji(firstCard.emoji);
        setTimeout(() => setJustMatchedEmoji(null), 500); // Animation duration
        setCards(prev => prev.map(card => card.emoji === firstCard.emoji ? { ...card, isMatched: true } : card));
      } else {
        setTimeout(() => {
          setCards(prev => prev.map(card => flippedCards.includes(card.id) ? { ...card, isFlipped: false } : card));
        }, 1000);
      }
      setFlippedCards([]);
    }
  }, [flippedCards, cards]);

  useEffect(() => {
    if (cards.length > 0 && cards.every(card => card.isMatched)) {
      playSound('victory');
      setGameOver(true);
      
      const finalMoves = Math.floor(moves / 2);
      const currentHighScore = difficulty ? highScores[difficulty] : null;
      
      if (difficulty && (currentHighScore === null || finalMoves < currentHighScore)) {
          const newHighScores = {...highScores, [difficulty]: finalMoves};
          onStateChange({ highScores: newHighScores });
      } else {
          onStateChange({ highScores });
      }
    }
  }, [cards, moves, difficulty, highScores, onStateChange]);

  const handleCardClick = (id: number) => {
    const clickedCard = cards.find(c => c.id === id);
    if (!clickedCard || clickedCard.isFlipped || clickedCard.isMatched || flippedCards.length === 2) return;
    playSound('flip');
    setCards(prev => prev.map(card => card.id === id ? { ...card, isFlipped: true } : card));
    setFlippedCards(prev => [...prev, id]);
    setMoves(prev => prev + 1);
  };
  
  const handlePlayAgain = () => {
      playSound('select');
      setGameOver(false);
      setDifficulty(null);
  };
  
  if (!difficulty || gameOver) {
      return (
          <div className="w-full text-center relative pt-12 flex flex-col items-center">
              <BackButton onClick={onBack} />
              <HelpButton onClick={onShowHelp} />
              <h1 className="text-3xl font-bold mb-2 text-gray-800">Jogo da Memória</h1>
              
              {gameOver && difficulty ? (
                  <div className="bg-white p-6 rounded-xl shadow-lg mt-4 w-full max-w-sm">
                      <h2 className="text-2xl font-bold text-green-500">Parabéns!</h2>
                      <p className="text-gray-600 mt-2">Você completou o nível <span className="font-semibold capitalize">{difficulty}</span>.</p>
                      <div className="my-4 text-lg">
                          <p>Movimentos: <span className="font-bold">{Math.floor(moves / 2)}</span></p>
                          <p>Recorde: <span className="font-bold">{highScores[difficulty] ?? 'N/A'}</span></p>
                      </div>
                      <button onClick={handlePlayAgain} className="mt-2 px-8 py-3 bg-[#ffde59] text-gray-800 font-semibold rounded-lg shadow-md hover:bg-yellow-400 transition-colors">Jogar Novamente</button>
                  </div>
              ) : (
                  <>
                      <p className="text-gray-500 mb-6">Escolha um nível de dificuldade.</p>
                      <div className="space-y-4 w-full max-w-sm">
                          {(['easy', 'medium', 'hard'] as Difficulty[]).map(diff => (
                              <button key={diff} onClick={() => startGame(diff)} className="w-full p-4 bg-white rounded-lg shadow-md text-left transition-transform hover:scale-105">
                                  <h3 className="text-lg font-bold capitalize text-gray-800">{diff}</h3>
                                  <p className="text-sm text-gray-500">Recorde: {highScores[diff] ? `${highScores[diff]} movimentos` : 'Nenhum'}</p>
                              </button>
                          ))}
                      </div>
                  </>
              )}
          </div>
      );
  }
  
  const currentSettings = DIFFICULTY_SETTINGS[difficulty];

  return (
    <div className="w-full text-center relative pt-12">
       <BackButton onClick={handlePlayAgain} />
       <HelpButton onClick={onShowHelp} />
       <h1 className="text-3xl font-bold mb-2 text-gray-800">Jogo da Memória</h1>
       <p className="text-gray-500 mb-6">Encontre os pares de emojis. Nível: <span className="capitalize font-semibold">{difficulty}</span></p>
       <div className={`grid mx-auto max-w-md ${currentSettings.grid}`}>
        {cards.map(card => (
          <div key={card.id} className={cn(currentSettings.cardSize, justMatchedEmoji === card.emoji && 'animate-correct-match')} onClick={() => handleCardClick(card.id)}>
            <div className={`w-full h-full rounded-lg shadow-md cursor-pointer transition-transform duration-500 [transform-style:preserve-3d] ${card.isFlipped || card.isMatched ? '[transform:rotateY(180deg)]' : ''}`}>
              <div className="absolute w-full h-full bg-blue-400 rounded-lg flex items-center justify-center [backface-visibility:hidden]"></div>
              <div className="absolute w-full h-full bg-white rounded-lg flex items-center justify-center text-3xl md:text-4xl [backface-visibility:hidden] [transform:rotateY(180deg)]">{card.emoji}</div>
            </div>
          </div>
        ))}
       </div>
       <p className="mt-6 text-gray-600">Movimentos: {Math.floor(moves / 2)}</p>
    </div>
  );
};

// --- Game: Mindfulness ---
const mindfulnessPrompts = [
    { prompt: "Liste 5 coisas que você pode VER ao seu redor.", icon: <EyeIcon className="w-8 h-8 text-blue-500" />, count: 5 },
    { prompt: "Identifique 4 coisas que você pode TOCAR.", icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>, count: 4 },
    { prompt: "Perceba 3 coisas que você pode OUVIR.", icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.636 5.636a9 9 0 0112.728 0M12 18a3 3 0 100-6 3 3 0 000 6z" /></svg>, count: 3 },
    { prompt: "Sinta 2 CHEIROS diferentes no ambiente.", icon: <WindIcon className="w-8 h-8 text-yellow-500" />, count: 2 },
    { prompt: "Qual é 1 SABOR que você pode sentir?", icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0v6" /></svg>, count: 1 },
];

interface MindfulnessGameProps {
  onBack: () => void;
  savedState?: GameState['mindfulness'];
  onStateChange: (state: GameState['mindfulness']) => void;
  onGameClear: () => void;
  onShowHelp: () => void;
}

const MindfulnessGame: React.FC<MindfulnessGameProps> = ({ onBack, savedState, onStateChange, onGameClear, onShowHelp }) => {
    const [step, setStep] = useState(savedState?.step || 0);
    const [inputs, setInputs] = useState<Record<number, string[]>>(savedState?.inputs || {});
    const isComplete = step >= mindfulnessPrompts.length;

    useEffect(() => {
        if (!isComplete) {
            onStateChange({ step, inputs });
        }
    }, [step, inputs, isComplete, onStateChange]);

    const handleInputChange = (stepIndex: number, inputIndex: number, value: string) => {
        setInputs(prev => {
            const newStepInputs = [...(prev[stepIndex] || [])];
            newStepInputs[inputIndex] = value;
            return { ...prev, [stepIndex]: newStepInputs };
        });
    };

    const handleNext = () => {
        playSound('select');
        const nextStep = step + 1;
        if (nextStep >= mindfulnessPrompts.length) {
            playSound('victory');
            onGameClear();
        }
        setStep(nextStep);
    };
    
    const resetGame = () => {
        playSound('select');
        onGameClear();
        setStep(0);
        setInputs({});
    };

    const currentPrompt = !isComplete ? mindfulnessPrompts[step] : null;
    const isStepComplete = currentPrompt ? (inputs[step]?.filter(input => input && input.trim() !== '').length === currentPrompt.count) : false;

    return (
        <div className="w-full text-center relative pt-12 flex flex-col items-center">
            <BackButton onClick={onBack} />
            <HelpButton onClick={onShowHelp} />
            <h1 className="text-3xl font-bold mb-2 text-gray-800">Exercício dos 5 Sentidos</h1>
            <p className="text-gray-500 mb-6 max-w-sm">Uma técnica para ancorar sua atenção no presente.</p>

            <div className="w-full max-w-sm min-h-[20rem] bg-white rounded-xl shadow-md p-6 flex flex-col justify-start items-center">
                {isComplete ? (
                    <div className="flex flex-col justify-center items-center h-full">
                        <h2 className="text-2xl font-bold text-green-500 mb-2">Parabéns!</h2>
                        <p className="text-gray-600">Você completou o exercício. Sinta-se mais presente e calmo.</p>
                    </div>
                ) : (
                    currentPrompt && (
                    <>
                        <div className="mb-4">{currentPrompt.icon}</div>
                        <p className="text-lg text-gray-700 font-semibold mb-4 text-center">{currentPrompt.prompt}</p>
                        <div className="w-full space-y-2">
                          {Array.from({ length: currentPrompt.count }).map((_, index) => (
                              <div key={index} className="flex items-center gap-2">
                                  <span className="text-gray-500 font-medium">{index + 1}.</span>
                                  <input
                                      type="text"
                                      className="w-full p-2 border border-gray-300 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-shadow text-gray-900"
                                      value={inputs[step]?.[index] ?? ''}
                                      onChange={(e) => handleInputChange(step, index, e.target.value)}
                                      placeholder={`Escreva aqui...`}
                                      aria-label={`Input for sense ${index + 1}`}
                                  />
                              </div>
                          ))}
                        </div>
                    </>
                ))}
            </div>
            
            <div className="flex items-center gap-4 mt-8">
                {(!isComplete && (savedState?.step || Object.keys(savedState?.inputs || {}).length > 0)) && (
                    <button onClick={resetGame} className="px-6 py-3 rounded-lg font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300">
                        Reiniciar
                    </button>
                )}
                <button 
                    onClick={isComplete ? onBack : handleNext} 
                    disabled={!isComplete && !isStepComplete}
                    className="px-8 py-3 rounded-lg font-bold text-white shadow-md transition-all bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    {isComplete ? 'Finalizar' : 'Próximo'}
                </button>
            </div>
        </div>
    );
};

// --- Game: Neuro-Sequence ---
interface SequenceGameProps {
  onBack: () => void;
  highScore: number;
  onNewHighScore: (score: number) => void;
  onShowHelp: () => void;
}

const SequenceGame: React.FC<SequenceGameProps> = ({ onBack, highScore, onNewHighScore, onShowHelp }) => {
    const [level, setLevel] = useState(1);
    const [score, setScore] = useState(0);
    const [sequence, setSequence] = useState<number[]>([]);
    const [playerSequence, setPlayerSequence] = useState<number[]>([]);
    const [gameState, setGameState] = useState<'idle' | 'showing' | 'playing' | 'feedback' | 'gameOver'>('idle');
    const [activeTile, setActiveTile] = useState<number | null>(null);
    const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
    const [correctTapIndex, setCorrectTapIndex] = useState<number | null>(null);

    useEffect(() => {
        if (score > highScore) {
            if (highScore > 0) {
              playSound('victory');
            }
            onNewHighScore(score);
        }
    }, [score, highScore, onNewHighScore]);

    const startNextLevel = useCallback(() => {
        setFeedback(null);
        setPlayerSequence([]);
        setGameState('showing');
        setSequence(currentSequence => [
            ...currentSequence,
            Math.floor(Math.random() * 9)
        ]);
    }, []);

    const startGame = () => {
        playSound('select');
        setLevel(1);
        setScore(0);
        setPlayerSequence([]);
        setFeedback(null);
        setGameState('showing');
        setSequence([Math.floor(Math.random() * 9)]);
    };

    useEffect(() => {
        if (gameState !== 'showing' || sequence.length === 0) return;

        let i = 0;
        const intervalId = setInterval(() => {
            playSound('flip');
            setActiveTile(sequence[i]);
            setTimeout(() => setActiveTile(null), 350);
            i++;
            if (i >= sequence.length) {
                clearInterval(intervalId);
                setTimeout(() => setGameState('playing'), 400);
            }
        }, 700);

        return () => clearInterval(intervalId);
    }, [gameState, sequence]);

    const handleTileClick = (index: number) => {
        if (gameState !== 'playing') return;

        setActiveTile(index);
        setTimeout(() => setActiveTile(null), 150);

        const newPlayerSequence = [...playerSequence, index];
        const currentIndex = newPlayerSequence.length - 1;

        if (sequence[currentIndex] !== index) {
            playSound('error');
            setFeedback('incorrect');
            setTimeout(() => setGameState('gameOver'), 800);
            return;
        }

        setCorrectTapIndex(index);
        setTimeout(() => setCorrectTapIndex(null), 400);

        playSound('click');
        setPlayerSequence(newPlayerSequence);

        if (newPlayerSequence.length === sequence.length) {
            setGameState('feedback');
            setFeedback('correct');
            playSound('confirm');
            setScore(prev => prev + sequence.length * 10);
            setTimeout(() => {
                setLevel(prev => prev + 1);
                startNextLevel();
            }, 1000);
        }
    };

    if (gameState === 'idle' || gameState === 'gameOver') {
        return (
            <div className="w-full text-center relative pt-12 flex flex-col items-center">
                <BackButton onClick={onBack} />
                <HelpButton onClick={onShowHelp} />
                
                {gameState === 'gameOver' ? (
                     <h1 className="text-3xl font-bold mb-2 text-red-500">Fim de Jogo</h1>
                ) : (
                     <h1 className="text-3xl font-bold mb-2 text-gray-800">Neuro-Sequência</h1>
                )}

                <p className="text-gray-500 mb-6 max-w-sm">
                    {gameState === 'gameOver' ? `Sua pontuação final foi ${score}.` : 'Teste sua memória. Repita a sequência de luzes.'}
                </p>

                <div className="mb-6">
                    <p className="text-lg text-gray-600">Recorde: <span className="font-bold">{highScore}</span></p>
                </div>
                <button onClick={startGame} className="mt-6 px-8 py-3 bg-[#38b6ff] text-white font-semibold rounded-lg shadow-md hover:bg-blue-500 transition-colors">
                    {gameState === 'gameOver' ? 'Jogar Novamente' : 'Começar'}
                </button>
            </div>
        );
    }
    
    const gridClasses = cn(
        "grid grid-cols-3 gap-3 p-2 transition-all duration-300",
        feedback === 'correct' && 'shadow-[0_0_20px_10px_rgba(74,222,128,0.5)] rounded-2xl',
        feedback === 'incorrect' && 'shadow-[0_0_20px_10px_rgba(239,68,68,0.5)] rounded-2xl',
    );
    
    return (
        <div className="w-full text-center relative pt-12 flex flex-col items-center">
            <BackButton onClick={onBack} />
            <HelpButton onClick={onShowHelp} />
            <h1 className="text-3xl font-bold mb-2 text-gray-800">Neuro-Sequência</h1>
            <div className="flex justify-around w-full max-w-xs my-4">
                <p className="text-lg text-gray-600">Nível: <span className="font-bold">{level}</span></p>
                <p className="text-lg text-gray-600">Pontos: <span className="font-bold">{score}</span></p>
            </div>

            <div className={gridClasses}>
                {Array.from({ length: 9 }).map((_, i) => (
                    <button
                        key={i}
                        disabled={gameState !== 'playing'}
                        onClick={() => handleTileClick(i)}
                        className={cn(
                            `w-20 h-20 rounded-lg transition-all duration-200 shadow-md disabled:opacity-70`,
                            activeTile === i ? 'bg-yellow-300 scale-105' : 'bg-gray-200 hover:bg-gray-300',
                            correctTapIndex === i && 'animate-correct-tap'
                        )}
                    />
                ))}
            </div>
            <p className="mt-6 text-gray-500 h-6 font-semibold animate-pulse">
                {gameState === 'showing' && 'Memorize...'}
                {gameState === 'playing' && 'Sua vez...'}
                {gameState === 'feedback' && feedback === 'correct' && 'Correto!'}
            </p>
        </div>
    );
};


// --- Game: Emotional Dilemma ---
interface EmotionalDilemmaGameProps {
  onBack: () => void;
  highScore: number;
  onNewHighScore: (score: number) => void;
  onShowHelp: () => void;
}

const EmotionalDilemmaGame: React.FC<EmotionalDilemmaGameProps> = ({ onBack, highScore, onNewHighScore, onShowHelp }) => {
    const [gameState, setGameState] = useState<'idle' | 'playing' | 'feedback' | 'end'>('idle');
    const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0);
    const [activeScenarios, setActiveScenarios] = useState<Scenario[]>([]);
    const [score, setScore] = useState(50);
    const [feedback, setFeedback] = useState<{ message: string; type: 'positive' | 'negative' | 'neutral' } | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const startGame = (scenarios: Scenario[]) => {
        playSound('select');
        setActiveScenarios(scenarios);
        setCurrentScenarioIndex(0);
        setScore(50);
        setFeedback(null);
        setGameState('playing');
    };

    const handleGenerateScenario = async () => {
        setIsGenerating(true);
        playSound('send');
        try {
            const aiScenario = await generateDilemmaScenario();
            startGame([aiScenario]);
        } catch (error) {
            console.error("Failed to generate AI scenario:", error);
            alert("Não foi possível gerar um novo cenário. Tente novamente.");
            playSound('error');
            setGameState('idle');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleChoice = (choice: Choice) => {
        if (gameState !== 'playing') return;

        if (choice.outcome === 'positive') playSound('confirm');
        else if (choice.outcome === 'negative') playSound('error');
        else playSound('select');

        setScore(prev => Math.max(0, Math.min(100, prev + choice.scoreChange)));
        setFeedback({ message: choice.consequence, type: choice.outcome });
        setGameState('feedback');

        setTimeout(() => {
            if (currentScenarioIndex < activeScenarios.length - 1) {
                setCurrentScenarioIndex(prev => prev + 1);
                setFeedback(null);
                setGameState('playing');
            } else {
                setGameState('end');
            }
        }, 3500);
    };
    
    const getEndGameMessage = () => {
        if (score > 80) return "Você demonstrou grande inteligência emocional! Sua capacidade de responder com empatia e calma é uma ferramenta poderosa.";
        if (score > 40) return "Você está no caminho certo! Continuar praticando a autoconsciência em momentos desafiadores te ajudará a se sentir mais conectado.";
        return "Toda jornada começa com um passo. Refletir sobre nossas reações é a chave para o crescimento. Continue praticando!";
    }
    
    useEffect(() => {
        if (gameState === 'end') {
            if (score > highScore) {
                onNewHighScore(score);
            }
            if (score > 80) playSound('victory');
            else playSound('win');
        }
    }, [gameState, score, highScore, onNewHighScore]);

    const scenario = activeScenarios[currentScenarioIndex];

    if (gameState === 'idle') {
        return (
            <div className="w-full text-center relative pt-12 flex flex-col items-center">
                <BackButton onClick={onBack} />
                <HelpButton onClick={onShowHelp} />
                <h1 className="text-3xl font-bold mb-2 text-gray-800">Dilemas Emocionais</h1>
                <p className="text-gray-500 mb-6 max-w-sm">Navegue por cenários sociais e aprimore sua inteligência emocional.</p>
                <div className="mb-4 text-lg text-gray-600">Recorde de Pontuação: <span className="font-bold">{highScore}</span></div>
                <div className="mt-2">
                    <button
                        onClick={handleGenerateScenario}
                        disabled={isGenerating}
                        className="px-8 py-3 bg-gradient-to-r from-purple-400 to-pink-500 text-white font-semibold rounded-lg shadow-md hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-wait"
                    >
                        {isGenerating ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <SparklesIcon className="w-5 h-5" />
                        )}
                        Novo Dilema
                    </button>
                </div>
            </div>
        );
    }
    
    if (gameState === 'end') {
         return (
            <div className="w-full text-center relative pt-12 flex flex-col items-center">
                <BackButton onClick={() => setGameState('idle')} />
                <HelpButton onClick={onShowHelp} />
                <h1 className="text-3xl font-bold mb-2 text-gray-800">Fim da Jornada</h1>
                <p className="text-gray-600 my-4 max-w-sm">{getEndGameMessage()}</p>
                <div className="w-full max-w-xs my-4">
                    <h3 className="text-lg font-semibold">Pontuação Final: {score}</h3>
                    <div className="w-full bg-gray-200 rounded-full h-4 my-2">
                        <div className="bg-gradient-to-r from-green-300 to-blue-400 h-4 rounded-full" style={{ width: `${score}%` }}></div>
                    </div>
                     <p className="text-sm text-gray-500">Recorde: {Math.max(highScore, score)}</p>
                </div>
                <button 
                    onClick={handleGenerateScenario} 
                    disabled={isGenerating}
                    className="mt-6 px-8 py-3 bg-[#38b6ff] text-white font-semibold rounded-lg shadow-md hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-wait flex items-center justify-center gap-2"
                >
                    {isGenerating ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        'Jogar Novamente'
                    )}
                </button>
            </div>
        );
    }

    const feedbackColors = {
        positive: 'border-green-400 bg-green-50 text-green-800',
        negative: 'border-red-400 bg-red-50 text-red-800',
        neutral: 'border-yellow-400 bg-yellow-50 text-yellow-800',
    };

    return (
        <div className="w-full text-center relative pt-12 flex flex-col items-center max-w-md mx-auto">
            <BackButton onClick={onBack} />
            <HelpButton onClick={onShowHelp} />
            <h1 className="text-2xl font-bold mb-1 text-gray-800">Dilemas Emocionais</h1>
            <p className="text-gray-500 mb-4">Cenário {currentScenarioIndex + 1} de {activeScenarios.length}</p>

            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-6">
                <div className="bg-blue-400 h-2.5 rounded-full" style={{ width: `${score}%`, transition: 'width 0.5s ease-in-out' }}></div>
            </div>

            <div className="w-full bg-white rounded-xl shadow-lg p-6 min-h-[12rem] flex flex-col justify-center items-center mb-6 relative">
                {gameState === 'feedback' && feedback ? (
                    <div className={cn('absolute inset-0 bg-white/95 backdrop-blur-sm rounded-xl flex flex-col justify-center items-center p-4 transition-opacity duration-300', feedbackColors[feedback.type])}>
                        <p className="font-semibold">{feedback.message}</p>
                    </div>
                ): null}
                <span className="text-5xl mb-4">{scenario.emotion}</span>
                <p className="text-lg text-gray-700">{scenario.situation}</p>
            </div>

            <div className="w-full space-y-3">
                {scenario.choices.map((choice, index) => (
                    <button
                        key={index}
                        onClick={() => handleChoice(choice)}
                        disabled={gameState === 'feedback'}
                        className="w-full text-left p-4 bg-white rounded-lg shadow-md border-2 border-transparent hover:border-blue-400 hover:bg-blue-50/50 transition-all disabled:opacity-50 disabled:hover:border-transparent disabled:cursor-not-allowed"
                    >
                       <p className="font-semibold text-gray-800">{choice.text}</p>
                    </button>
                ))}
            </div>
        </div>
    );
};


// --- Game Menu ---
interface GameCardProps {
    title: string;
    description: string;
    icon: React.ReactNode;
    onClick: () => void;
    className?: string;
}
const GameCard: React.FC<GameCardProps> = ({ title, description, icon, onClick, className }) => (
    <div onClick={() => { playSound('navigation'); onClick(); }} className={cn("bg-white p-6 rounded-2xl shadow-lg cursor-pointer transition-transform transform hover:-translate-y-1 active:scale-95", className)}>
        <div className="flex items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-full">{icon}</div>
            <div>
                <h3 className="text-xl font-bold text-gray-800">{title}</h3>
                <p className="text-gray-500 mt-1">{description}</p>
            </div>
        </div>
    </div>
);

interface GameMenuProps {
  onSelectGame: (game: Game) => void;
  gameState: GameState;
}

const GameMenu: React.FC<GameMenuProps> = ({ onSelectGame, gameState }) => (
    <div className="w-full">
        <h1 className="text-3xl font-bold mb-2 text-gray-800">Games Mentais</h1>
        <p className="text-gray-500 mb-6">Desafie sua mente e encontre a calma.</p>
        <div className="space-y-4">
            <GameCard 
                title="Dilemas Emocionais"
                description="Navegue por cenários e aprimore sua inteligência emocional."
                icon={<MessageSquareHeartIcon className="w-6 h-6 text-blue-500" />}
                onClick={() => onSelectGame('dilemma')}
            />
            <GameCard 
                title="Jogo da Memória"
                description={gameState.memory?.cards ? "Continue seu jogo inacabado." : "Encontre os pares e exercite sua mente."}
                icon={<BrainIcon className="w-6 h-6 text-blue-500" />}
                onClick={() => onSelectGame('memory')}
            />
            <GameCard 
                title="Neuro-Sequência"
                description="Memorize e repita padrões para turbinar sua mente."
                icon={<ZapIcon className="w-6 h-6 text-blue-500" />}
                onClick={() => onSelectGame('sequence')}
            />
            <GameCard 
                title="Exercício dos 5 Sentidos"
                description={gameState.mindfulness ? "Continue seu exercício inacabado." : "Ancore sua atenção no momento presente."}
                icon={<EyeIcon className="w-6 h-6 text-blue-500" />}
                onClick={() => onSelectGame('mindfulness')}
            />
        </div>
    </div>
);


// --- Main Screen Component ---
type HelpContent = { title: string; instructions: React.ReactNode } | null;

interface GamesScreenProps {
    handleProtectedAction: (action: () => void) => void;
}

const GamesScreen: React.FC<GamesScreenProps> = ({ handleProtectedAction }) => {
  const [activeScreen, setActiveScreen] = useState<Game>('menu');
  const [previousScreen, setPreviousScreen] = useState<Game | null>(null);
  const [direction, setDirection] = useState<'left' | 'right' | null>(null);
  const [helpContent, setHelpContent] = useState<HelpContent>(null);

  const [gameState, setGameState] = useState<GameState>(() => {
    try {
        const savedProgress = localStorage.getItem(GAME_PROGRESS_KEY);
        return savedProgress ? JSON.parse(savedProgress) : {};
    } catch (error) {
        console.error("Failed to parse game progress from localStorage", error);
        return {};
    }
  });

  useEffect(() => {
    localStorage.setItem(GAME_PROGRESS_KEY, JSON.stringify(gameState));
  }, [gameState]);

  useEffect(() => {
    if (previousScreen) {
        const timer = setTimeout(() => {
            setPreviousScreen(null);
        }, 300); // Must match animation duration
        return () => clearTimeout(timer);
    }
  }, [previousScreen]);
  
  const handleSelectGame = (game: Game) => {
    handleProtectedAction(() => {
        setDirection('right');
        setPreviousScreen(activeScreen);
        setActiveScreen(game);
    });
  }
  
  const handleBackToMenu = () => {
    setDirection('left');
    setPreviousScreen(activeScreen);
    setActiveScreen('menu');
  }

  const updateGameState = useCallback(<K extends keyof GameState>(game: K, data: GameState[K]) => {
    setGameState(prev => ({ ...prev, [game]: data }));
  }, []);

  const clearGameState = useCallback((game: keyof GameState) => {
    setGameState(prev => {
        const newState = { ...prev };
        delete newState[game];
        return newState;
    });
  }, []);

  const renderScreenComponent = (screen: Game) => {
    switch(screen) {
        case 'memory':
            return <MemoryGame 
                onBack={handleBackToMenu} 
                savedState={gameState.memory}
                onStateChange={(data) => updateGameState('memory', data)}
                onShowHelp={() => setHelpContent(GAME_INSTRUCTIONS.memory)}
            />;
        case 'sequence':
            return <SequenceGame 
                onBack={handleBackToMenu}
                highScore={gameState.sequence?.highScore ?? 0}
                onNewHighScore={(score) => updateGameState('sequence', { highScore: score })}
                onShowHelp={() => setHelpContent(GAME_INSTRUCTIONS.sequence)}
            />;
        case 'mindfulness':
            return <MindfulnessGame 
                onBack={handleBackToMenu} 
                savedState={gameState.mindfulness}
                onStateChange={(data) => updateGameState('mindfulness', data)}
                onGameClear={() => clearGameState('mindfulness')}
                onShowHelp={() => setHelpContent(GAME_INSTRUCTIONS.mindfulness)}
            />;
        case 'dilemma':
            return <EmotionalDilemmaGame 
                onBack={handleBackToMenu} 
                highScore={gameState.dilemma?.highScore ?? 0}
                onNewHighScore={(score) => updateGameState('dilemma', { highScore: score })}
                onShowHelp={() => setHelpContent(GAME_INSTRUCTIONS.dilemma)}
            />;
        case 'menu':
        default:
            return <GameMenu onSelectGame={handleSelectGame} gameState={gameState} />;
    }
  };

  return (
    <div className="p-4 pb-28 bg-gray-50 h-full overflow-y-auto flex flex-col items-center relative">
       {helpContent && (
        <HelpModal title={helpContent.title} onClose={() => setHelpContent(null)}>
            {helpContent.instructions}
        </HelpModal>
       )}

       {previousScreen && (
            <div 
                key={previousScreen} 
                className={`absolute inset-0 w-full h-full p-4 pb-28 overflow-y-auto ${direction === 'right' ? 'animate-slide-out-to-left' : 'animate-slide-out-to-right'}`}
            >
                <div className="w-full min-h-full flex flex-col items-center">
                    {renderScreenComponent(previousScreen)}
                </div>
            </div>
        )}
        <div 
            key={activeScreen} 
            className={`absolute inset-0 w-full h-full p-4 pb-28 overflow-y-auto ${direction ? (direction === 'right' ? 'animate-slide-in-from-right' : 'animate-slide-in-from-left') : ''}`}
        >
             <div className="w-full min-h-full flex flex-col items-center">
                {renderScreenComponent(activeScreen)}
            </div>
        </div>
    </div>
  );
};

export default GamesScreen;