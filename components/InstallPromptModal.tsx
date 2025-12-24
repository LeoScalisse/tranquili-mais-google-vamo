import React, { useEffect, useState } from 'react';
import { X, ShareIcon, MoreVerticalIcon, DownloadIcon, Plus } from './ui/Icons';
import { Button } from './ui/Shadcn';

const AppLogo = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className={className}>
    <rect width="512" height="512" fill="#38b6ff"/>
    <path d="M256 120V392M120 256H392" stroke="#ffde59" stroke-width="110" stroke-linecap="round" />
  </svg>
);

const InstallPromptModal: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('desktop');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Check if app is already installed (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isStandalone) return;

    // Check if user has dismissed the prompt recently
    const dismissed = localStorage.getItem('installPromptDismissed');
    if (dismissed) return;

    // Detect Platform
    const userAgent = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setPlatform('ios');
      setIsVisible(true);
    } else if (/android/.test(userAgent)) {
      setPlatform('android');
      // Android usually fires beforeinstallprompt, wait for it or show manual instructions if it fails
      setIsVisible(true); 
    } else {
      setPlatform('desktop');
      setIsVisible(true);
    }

    // Capture the install prompt event (Chrome/Edge/Android)
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsVisible(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('installPromptDismissed', 'true');
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center pointer-events-none">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 pointer-events-auto" onClick={handleDismiss} />

      {/* Modal Content */}
      <div className="relative w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl pointer-events-auto animate-slide-in-from-bottom sm:animate-fade-in m-0 sm:m-4">
        <button 
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-1 rounded-full text-gray-400 hover:bg-gray-100 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-2xl shadow-lg overflow-hidden mb-4">
             <AppLogo className="w-full h-full" />
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-2">Instale o Tranquili<span className="text-[#ffde59]">+</span></h2>
          <p className="text-gray-600 mb-6 text-sm">
            Adicione o aplicativo à sua tela inicial para uma experiência melhor, <span className="text-[#ffde59]">+</span> rápida e em tela cheia.
          </p>

          {/* Platform Specific Instructions */}
          <div className="w-full bg-gray-50 rounded-xl p-4 text-left mb-6 border border-gray-100">
            {platform === 'ios' && (
              <div className="space-y-3 text-sm text-gray-700">
                <p className="flex items-center gap-2">
                  1. Toque no ícone <strong className="inline-flex items-center gap-1 text-blue-600"><ShareIcon className="w-4 h-4" /> Compartilhar</strong> na barra do navegador.
                </p>
                <p className="flex items-center gap-2">
                  2. Role para baixo e selecione <strong className="inline-flex items-center gap-1 text-gray-900"><Plus className="w-4 h-4 border border-gray-400 rounded-[4px] p-0.5" /> Adicionar à Tela de Início</strong>.
                </p>
              </div>
            )}

            {platform === 'android' && (
              <div className="space-y-3 text-sm text-gray-700">
                {deferredPrompt ? (
                    <p className="text-center">Toque no botão abaixo para instalar.</p>
                ) : (
                    <>
                        <p className="flex items-center gap-2">
                        1. Toque no menu <strong className="inline-flex items-center gap-1 text-gray-900"><MoreVerticalIcon className="w-4 h-4" /></strong> do navegador.
                        </p>
                        <p className="flex items-center gap-2">
                        2. Selecione <strong className="text-gray-900">Instalar aplicativo</strong> ou <strong className="text-gray-900">Adicionar à tela inicial</strong>.
                        </p>
                    </>
                )}
              </div>
            )}

            {platform === 'desktop' && (
              <div className="space-y-3 text-sm text-gray-700">
                 {deferredPrompt ? (
                    <p className="text-center">Clique no botão abaixo para instalar no seu computador.</p>
                ) : (
                    <p className="flex items-center gap-2">
                    Clique no ícone de instalação <strong className="inline-flex items-center gap-1 text-gray-900"><DownloadIcon className="w-4 h-4" /></strong> na barra de endereço do navegador (canto direito).
                    </p>
                )}
              </div>
            )}
          </div>

          {deferredPrompt ? (
             <Button 
                onClick={handleInstallClick} 
                className="w-full py-6 text-lg font-bold shadow-lg bg-[#38b6ff] hover:bg-blue-500"
             >
                Instalar Agora
             </Button>
          ) : (
            <Button 
                variant="outline" 
                onClick={handleDismiss}
                className="w-full border-gray-200 text-gray-500 hover:text-gray-900"
            >
                Entendi, farei depois
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstallPromptModal;