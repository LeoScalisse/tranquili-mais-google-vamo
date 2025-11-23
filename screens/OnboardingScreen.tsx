import React, { useState } from 'react';
import { UserProfile } from '../types';
import SlideButton from '../components/SlideButton';
import RadialOrbitalTimeline from '../components/RadialOrbitalTimeline';
import { ICON_SETS } from '../constants';
import { CheckIcon } from '../components/ui/Icons';

// --- Sub-components for Onboarding Steps ---

const BreathingAnimator: React.FC<{ onComplete: () => void; onSkip: () => void }> = ({ onComplete, onSkip }) => {
  const [phase, setPhase] = useState<'inhale' | 'hold' | 'exhale' | 'done'>('inhale');
  const [cycle, setCycle] = useState(0);
  const totalCycles = 3;

  const phaseConfig = {
    inhale: { text: 'Inspire...', duration: 4000, next: 'hold' as const },
    hold: { text: 'Segure...', duration: 3000, next: 'exhale' as const },
    exhale: { text: 'Solte...', duration: 5000, next: 'inhale' as const },
  };

  React.useEffect(() => {
    if (cycle >= totalCycles) {
      setPhase('done');
      const timer = setTimeout(onComplete, 1000);
      return () => clearTimeout(timer);
    }

    if (phase !== 'done') {
      const { duration, next } = phaseConfig[phase];
      const timer = setTimeout(() => {
        if (phase === 'exhale') {
          setCycle(c => c + 1);
        }
        setPhase(next);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [phase, cycle, onComplete, totalCycles]);

  const getAnimationClass = () => {
    switch (phase) {
      case 'inhale': return 'scale-150 opacity-100';
      case 'hold': return 'scale-150 opacity-90';
      case 'exhale': return 'scale-100 opacity-80';
      default: return 'scale-100 opacity-0';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full relative animate-fade-in">
      <div className="relative flex items-center justify-center mb-12">
        <div className={`absolute w-64 h-64 bg-white/20 rounded-full blur-2xl transition-all ease-in-out duration-[4000ms] ${phase === 'inhale' || phase === 'hold' ? 'opacity-60 scale-110' : 'opacity-20 scale-90'}`}></div>
        <div className={`w-40 h-40 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center transition-all ease-in-out ${getAnimationClass()}`} style={{transitionDuration: `${phaseConfig[phase as keyof typeof phaseConfig]?.duration || 1000}ms`}}>
             <div className="w-full h-full rounded-full bg-white/40 animate-pulse"></div>
        </div>
        <div className="absolute mt-64 text-center">
             <h2 className="text-3xl text-white font-light tracking-wide transition-opacity duration-500">
                {phase !== 'done' ? phaseConfig[phase as keyof typeof phaseConfig].text : 'Pronto'}
             </h2>
        </div>
      </div>
      <button onClick={onSkip} className="absolute bottom-10 text-white/60 text-sm hover:text-white transition-colors uppercase tracking-widest">
         Pular
      </button>
    </div>
  );
};

const OnboardingScreen: React.FC<{ onComplete: (profile: UserProfile) => void }> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [path, setPath] = useState('');
  const [reason, setReason] = useState('');
  const [fade, setFade] = useState(true);

  const handleNext = () => {
    setFade(false);
    setTimeout(() => {
      if (step === questions.length - 1) {
        onComplete({ name, path, reason });
      } else {
        setStep(step + 1);
        setFade(true);
      }
    }, 300);
  };

  const handlePathSelect = (selectedPath: string) => {
    setPath(selectedPath);
  };

  const FeaturePreview = () => (
    <div className="mt-6 space-y-4 text-left animate-fade-in">
      <div className="flex items-center p-3 bg-white border border-gray-100 shadow-sm rounded-xl">
        <div className="p-2 bg-blue-50 rounded-full mr-3 text-[#38b6ff]">{ICON_SETS.default.reports}</div>
        <div>
          <h3 className="font-bold text-gray-900 text-sm">Diário de Humor</h3>
          <p className="text-xs text-gray-600">Registre e entenda seus sentimentos.</p>
        </div>
      </div>
      <div className="flex items-center p-3 bg-white border border-gray-100 shadow-sm rounded-xl">
        <div className="p-2 bg-green-50 rounded-full mr-3 text-green-500">{ICON_SETS.default.chat}</div>
        <div>
          <h3 className="font-bold text-gray-900 text-sm">Tranquilinha IA</h3>
          <p className="text-xs text-gray-600">Converse e receba apoio a qualquer hora.</p>
        </div>
      </div>
       <div className="flex items-center p-3 bg-white border border-gray-100 shadow-sm rounded-xl">
        <div className="p-2 bg-yellow-50 rounded-full mr-3 text-yellow-500">{ICON_SETS.default.games}</div>
        <div>
          <h3 className="font-bold text-gray-900 text-sm">Pausa Mental</h3>
          <p className="text-xs text-gray-600">Jogos para acalmar a mente.</p>
        </div>
      </div>
    </div>
  );

  const questions = [
    {
      title: <>Bem-vindo ao <br/><span className="text-4xl block mt-2 text-[#38b6ff]">Tranquili<span className="text-[#ffde59]">+</span></span></>,
      subtitle: "Seu refúgio de calma, clareza e bem-estar.",
      content: null,
      showButton: true,
      buttonText: 'Começar Jornada',
      backgroundClass: 'bg-white',
      isDark: false
    },
    {
      title: "Como você gostaria de ser chamado?",
      subtitle: <>Para tornarmos sua experiência <span className="text-[#ffde59]">+</span> pessoal.</>,
      content: (
        <div className="mt-6 w-full">
            <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="Seu nome ou apelido" 
                className="w-full p-4 text-center text-xl bg-gray-50 border-b-2 border-gray-200 focus:border-[#38b6ff] outline-none transition-colors rounded-t-lg text-gray-900 placeholder-gray-400"
                autoFocus
            />
        </div>
      ),
      showButton: true,
      buttonText: 'Continuar',
      isDark: false
    },
    {
      title: `Olá, ${name}!`,
      subtitle: "Veja o que preparamos para o seu bem-estar:",
      content: <FeaturePreview />,
      showButton: true,
      buttonText: 'Explorar',
      isDark: false
    },
    {
      title: "Qual é o seu foco principal?",
      subtitle: "Escolha um caminho para personalizarmos sua jornada.",
      content: <RadialOrbitalTimeline onPathSelect={handlePathSelect} />,
      isFullScreen: true,
      showButton: true,
      buttonText: 'Escolher este caminho',
      backgroundClass: 'bg-[#38b6ff]',
      isDark: true
    },
    {
      title: "O que te traz aqui?",
      subtitle: "Conte-nos um pouco sobre seus objetivos ou como está se sentindo.",
      content: (
        <textarea 
            value={reason} 
            onChange={(e) => setReason(e.target.value)} 
            placeholder="Escreva aqui..." 
            className="mt-4 p-4 border border-gray-200 rounded-xl w-full h-32 focus:ring-2 focus:ring-[#38b6ff] outline-none resize-none bg-gray-50 text-gray-900 placeholder-gray-400" 
        />
      ),
      showButton: true,
      buttonText: 'Próximo',
      backgroundClass: 'bg-gray-50',
      isDark: false
    },
    {
      title: "Respire fundo...",
      subtitle: "Vamos fazer uma pequena pausa antes de entrar.",
      content: <BreathingAnimator onComplete={handleNext} onSkip={handleNext} />,
      showButton: false,
      isFullScreen: true,
      backgroundClass: 'bg-gradient-to-br from-indigo-500 to-purple-500',
      isDark: true
    },
    {
        title: "Tudo pronto!",
        subtitle: "Seu espaço seguro foi criado com sucesso.",
        content: (
             <div className="mt-8 flex justify-center">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center animate-pulse">
                    <CheckIcon className="w-12 h-12 text-green-600" />
                </div>
             </div>
        ),
        showButton: true,
        buttonText: 'Entrar no App',
        backgroundClass: 'bg-white',
        isDark: false
    }
  ];

  const totalSteps = questions.length;
  const currentQuestion = questions[step];
  const isButtonDisabled = (step === 1 && !name) || (step === 3 && !path) || (step === 4 && !reason);
  const backgroundClass = currentQuestion.backgroundClass || 'bg-gray-50';
  const textColorClass = currentQuestion.isDark ? 'text-white' : 'text-gray-900';
  const subTextColorClass = currentQuestion.isDark ? 'text-white/80' : 'text-gray-600';

  return (
    <div className={`flex flex-col items-center justify-center h-screen text-center transition-colors duration-500 ease-in-out ${backgroundClass} relative overflow-hidden`}>
       
       {/* Progress Bar */}
       <div className="absolute top-0 left-0 w-full h-1.5 bg-gray-200/30 z-20">
          <div className={`h-full transition-all duration-500 ease-out ${currentQuestion.isDark ? 'bg-white/80' : 'bg-[#38b6ff]'}`} style={{ width: `${((step + 1) / totalSteps) * 100}%` }} />
       </div>

      <div className={`transition-all duration-500 ease-out w-full ${fade ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} ${currentQuestion.isFullScreen ? 'h-full flex flex-col' : 'max-w-lg px-6'}`}>
        
        {currentQuestion.isFullScreen ? (
           <div className="flex-1 flex flex-col justify-center items-center p-6 relative z-10">
             <div className="pt-8 max-w-xl">
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">{currentQuestion.title}</h1>
                <p className="text-lg text-white/90 mb-6">{currentQuestion.subtitle}</p>
             </div>
             <div className="w-full flex-1 relative flex items-center justify-center">
                {currentQuestion.content}
             </div>
              {/* Special Case for Path Select Button position */}
              {path && step === 3 && (
                  <div className="py-8 w-full max-w-xs mx-auto animate-fade-in">
                      <SlideButton
                          key={`${step}-fs`}
                          onComplete={handleNext}
                          disabled={isButtonDisabled}
                          text={currentQuestion.buttonText}
                      />
                  </div>
              )}
           </div>
        ) : (
          <div className="bg-white/90 backdrop-blur-sm p-8 rounded-3xl shadow-xl w-full relative border border-white/50">
            <div className="mt-2">
                <h1 className={`text-3xl font-bold mb-3 ${textColorClass}`}>{currentQuestion.title}</h1>
                <p className={`text-lg ${subTextColorClass}`}>{currentQuestion.subtitle}</p>
            </div>
            
            <div className="min-h-[80px] flex flex-col justify-center py-4">
                 {currentQuestion.content}
            </div>

            {currentQuestion.showButton && (
                <div className="mt-6">
                    <SlideButton
                        key={step}
                        onComplete={handleNext}
                        disabled={isButtonDisabled}
                        text={currentQuestion.buttonText}
                    />
                </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OnboardingScreen;