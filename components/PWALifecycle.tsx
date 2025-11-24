import React, { useEffect, useState } from 'react';
import { RefreshCwIcon, X } from './ui/Icons';
import { Button } from './ui/Shadcn';

export const PWALifecycle: React.FC = () => {
  const [showReload, setShowReload] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  const onSWUpdate = (registration: ServiceWorkerRegistration) => {
    setShowReload(true);
    setWaitingWorker(registration.waiting);
  };

  useEffect(() => {
    if ('serviceWorker' in navigator) {
        // Explicitly construct URL with current origin to prevent mismatch errors
        // in preview environments (like AI Studio) where base URLs might differ.
        const swUrl = `${window.location.origin}/sw.js`;

        navigator.serviceWorker.register(swUrl).then((registration) => {
            // Check if there is already a waiting worker (update downloaded but not activated)
            if (registration.waiting) {
                onSWUpdate(registration);
            }

            // Detect when a new worker is found and installed
            registration.onupdatefound = () => {
                const newWorker = registration.installing;
                if (newWorker) {
                    newWorker.onstatechange = () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            onSWUpdate(registration);
                        }
                    };
                }
            };
        }).catch(error => {
            // Log error but don't crash app. Common in dev/preview environments without HTTPS/Locahost
            console.log("Service Worker registration skipped/failed (expected in some preview envs):", error);
        });

        // Reload when the new worker takes control
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!refreshing) {
                window.location.reload();
                refreshing = true;
            }
        });
    }
  }, []);

  const reloadPage = () => {
    waitingWorker?.postMessage({ type: 'SKIP_WAITING' });
    setShowReload(false);
  };

  if (!showReload) return null;

  return (
      <div className="fixed bottom-24 left-4 right-4 md:right-4 md:left-auto md:bottom-4 md:w-96 bg-white border border-gray-200 shadow-2xl rounded-xl p-4 z-[100] animate-slide-in-from-right flex flex-col gap-3">
          <div className="flex items-start gap-3">
              <div className="bg-blue-100 p-2 rounded-full text-[#38b6ff]">
                  <RefreshCwIcon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                  <h3 className="font-bold text-gray-800">Atualização Disponível</h3>
                  <p className="text-sm text-gray-600 mt-1">Uma nova versão do Tranquili+ está pronta. Atualize para obter as últimas melhorias.</p>
              </div>
              <button onClick={() => setShowReload(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors">
                  <X className="w-5 h-5" />
              </button>
          </div>
          <Button onClick={reloadPage} className="w-full bg-[#38b6ff] hover:bg-blue-500 text-white font-bold shadow-md">
              Atualizar Agora
          </Button>
      </div>
  );
}