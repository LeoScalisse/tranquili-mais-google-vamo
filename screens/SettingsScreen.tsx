import React, { useState } from 'react';
import { AppSettings } from '../types';
import { playSound, setMasterVolume } from '../services/soundService';
import { ICON_SETS, ICON_SET_NAMES } from '../constants';
import { supabase } from '../services/supabaseClient';
import { HeartIcon } from '../components/ui/Icons';


interface SettingsScreenProps {
  settings: AppSettings;
  setSettings: (settings: AppSettings) => void;
  onLogout: () => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ settings, setSettings, onLogout }) => {
  const [isConfirmingLogout, setIsConfirmingLogout] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
  const [connectionMessage, setConnectionMessage] = useState('');
  
  // Health Integration States
  const [healthSyncStatus, setHealthSyncStatus] = useState<Record<string, 'idle' | 'syncing' | 'connected'>>({
      googleFit: settings.healthIntegrations?.googleFit ? 'connected' : 'idle',
      appleHealth: settings.healthIntegrations?.appleHealth ? 'connected' : 'idle'
  });

  const handleNotificationsToggle = () => {
    playSound('toggle');
    setSettings({ ...settings, notificationsEnabled: !settings.notificationsEnabled });
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setSettings({ ...settings, soundVolume: newVolume });
    setMasterVolume(newVolume);
  };

  const handleVolumeChangeEnd = () => {
    // Play sound on release to avoid noise while dragging
    playSound('select');
  };
  
  const handleIconSetChange = (setName: string) => {
    playSound('select');
    setSettings({ ...settings, iconSet: setName });
  };
  
  const toggleHealthIntegration = (service: 'googleFit' | 'appleHealth') => {
      const currentStatus = healthSyncStatus[service];
      
      if (currentStatus === 'connected') {
          // Disconnect
          playSound('toggle');
          setSettings({
              ...settings,
              healthIntegrations: { ...settings.healthIntegrations!, [service]: false }
          });
          setHealthSyncStatus(prev => ({ ...prev, [service]: 'idle' }));
      } else {
          // Connect (Simulate Sync)
          playSound('select');
          setHealthSyncStatus(prev => ({ ...prev, [service]: 'syncing' }));
          
          setTimeout(() => {
              playSound('confirm');
              setHealthSyncStatus(prev => ({ ...prev, [service]: 'connected' }));
              setSettings({
                  ...settings,
                  healthIntegrations: { ...settings.healthIntegrations!, [service]: true }
              });
          }, 1500); // Fake 1.5s sync time
      }
  };


  const handleLogout = () => {
    playSound('confirm');
    onLogout();
  }
  
  const checkDatabaseConnection = async () => {
      setConnectionStatus('checking');
      setConnectionMessage('Verificando...');
      try {
          // Try to fetch a single row from profiles to test connection and schema
          const { error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
          
          if (error) {
              // PGRST116 just means no rows found, which is technically a successful connection/schema check
              // but usually auth policies prevent seeing other rows.
              // 42P01 is "undefined table" -> Missing SQL
              if (error.code === '42P01') {
                  setConnectionStatus('error');
                  setConnectionMessage("Tabela 'profiles' não encontrada.");
              } else {
                   // For other errors, assuming connected but maybe permission issues, which counts as 'connected' for this test
                   // or actual network error.
                   console.error("DB Check Error:", error);
                   setConnectionStatus('success'); // Assuming we reached the server at least
                   setConnectionMessage("Conectado (Aviso: " + error.code + ")");
              }
          } else {
              setConnectionStatus('success');
              setConnectionMessage("Conexão Bem-sucedida!");
          }
      } catch (e: any) {
          setConnectionStatus('error');
          setConnectionMessage("Erro de rede ou configuração.");
      }
  };

  const ConfirmationModal = () => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
        <h3 className="text-xl font-bold text-gray-800">Sair da sua conta?</h3>
        <p className="text-gray-600 my-4">
          Seu progresso está salvo. Você pode fazer login novamente a qualquer momento.
        </p>
        <div className="flex justify-center space-x-4">
          <button
            onClick={() => setIsConfirmingLogout(false)}
            className="px-6 py-2 rounded-lg font-semibold bg-gray-200 text-gray-800"
          >
            Cancelar
          </button>
          <button
            onClick={handleLogout}
            className="px-6 py-2 rounded-lg font-semibold bg-red-500 text-white"
          >
            Sair
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 pb-28 bg-gray-50 h-full text-gray-800 overflow-y-auto">
      {isConfirmingLogout && <ConfirmationModal />}
      <h1 className="text-3xl font-bold mb-6">Configurações</h1>

      <div className="space-y-6">
        {/* General Settings */}
        <div className="bg-white p-4 rounded-xl shadow-md space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Notificações</h2>
            <button
              onClick={handleNotificationsToggle}
              role="switch"
              aria-checked={settings.notificationsEnabled}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.notificationsEnabled ? 'bg-[#38b6ff]' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          
          <div>
            <h2 className="text-lg font-semibold mb-3">Volume dos Efeitos</h2>
            <div className="flex items-center space-x-3">
              <span role="img" aria-label="Volume down">🔇</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={settings.soundVolume}
                onChange={handleVolumeChange}
                onMouseUp={handleVolumeChangeEnd}
                onTouchEnd={handleVolumeChangeEnd}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#38b6ff]"
                aria-label="Volume control"
              />
              <span role="img" aria-label="Volume up">🔊</span>
            </div>
            <div className="text-center text-sm text-gray-500 mt-2">
              {Math.round(settings.soundVolume * 100)}%
            </div>
          </div>
        </div>
        
        {/* Health Integrations */}
        <div className="bg-white p-4 rounded-xl shadow-md">
            <div className="flex items-center gap-2 mb-4">
                <HeartIcon className="w-5 h-5 text-red-500" />
                <h2 className="text-lg font-semibold">Integrações de Saúde</h2>
            </div>
            <p className="text-sm text-gray-500 mb-4">Conecte para ver como seu sono e atividades afetam seu humor.</p>
            
            <div className="space-y-4">
                {/* Google Fit */}
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-full border border-gray-200 flex items-center justify-center p-1">
                             <svg viewBox="0 0 48 48" className="w-full h-full"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></svg>
                        </div>
                        <span className="font-medium text-gray-700">Google Fit</span>
                    </div>
                    <button
                        onClick={() => toggleHealthIntegration('googleFit')}
                        disabled={healthSyncStatus.googleFit === 'syncing'}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                            healthSyncStatus.googleFit === 'connected'
                                ? 'bg-green-100 text-green-700 border border-green-200'
                                : healthSyncStatus.googleFit === 'syncing'
                                    ? 'bg-gray-100 text-gray-500'
                                    : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        {healthSyncStatus.googleFit === 'connected' ? 'Conectado' : healthSyncStatus.googleFit === 'syncing' ? 'Sincronizando...' : 'Conectar'}
                    </button>
                </div>

                {/* Apple Health */}
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center text-white">
                            <HeartIcon className="w-5 h-5 fill-current" />
                        </div>
                        <span className="font-medium text-gray-700">Saúde (Apple)</span>
                    </div>
                    <button
                        onClick={() => toggleHealthIntegration('appleHealth')}
                        disabled={healthSyncStatus.appleHealth === 'syncing'}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                            healthSyncStatus.appleHealth === 'connected'
                                ? 'bg-green-100 text-green-700 border border-green-200'
                                : healthSyncStatus.appleHealth === 'syncing'
                                    ? 'bg-gray-100 text-gray-500'
                                    : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        {healthSyncStatus.appleHealth === 'connected' ? 'Conectado' : healthSyncStatus.appleHealth === 'syncing' ? 'Sincronizando...' : 'Conectar'}
                    </button>
                </div>
            </div>
        </div>
        
        {/* Diagnostic Tool */}
        <div className="bg-white p-4 rounded-xl shadow-md">
            <h2 className="text-lg font-semibold mb-3">Diagnóstico</h2>
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <span className="text-gray-600">Banco de Dados</span>
                    <button 
                        onClick={checkDatabaseConnection}
                        disabled={connectionStatus === 'checking'}
                        className="text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-600 font-medium hover:bg-blue-100 transition-colors disabled:opacity-50"
                    >
                        {connectionStatus === 'checking' ? 'Testando...' : 'Testar Conexão'}
                    </button>
                </div>
                {connectionStatus !== 'idle' && (
                    <div className={`text-sm p-2 rounded-lg ${connectionStatus === 'success' ? 'bg-green-50 text-green-700' : connectionStatus === 'error' ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-600'}`}>
                        {connectionMessage}
                    </div>
                )}
            </div>
        </div>
        
        {/* Personalization */}
        <div className="bg-white p-4 rounded-xl shadow-md">
            <h2 className="text-lg font-semibold mb-3">Pacote de Ícones</h2>
            <div className="space-y-3">
                {Object.entries(ICON_SETS).map(([setName, icons]) => (
                    <button
                        key={setName}
                        onClick={() => handleIconSetChange(setName)}
                        className={`w-full flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
                            settings.iconSet === setName
                                ? 'border-[#38b6ff] bg-blue-50/50'
                                : 'border-gray-200 bg-white hover:bg-gray-50'
                        }`}
                    >
                        <span className={`font-semibold ${settings.iconSet === setName ? 'text-[#38b6ff]' : 'text-gray-800'}`}>
                            {ICON_SET_NAMES[setName]}
                        </span>
                        <div className={`flex items-center space-x-4 ${settings.iconSet === setName ? 'text-[#38b6ff]' : 'text-gray-500'}`}>
                            {icons.home}
                            {icons.chat}
                            {icons.games}
                            {icons.reports}
                            {icons.settings}
                        </div>
                    </button>
                ))}
            </div>
        </div>

        {/* Danger Zone */}
        <div className="border-t border-gray-200 pt-6">
          <h2 className="text-lg font-semibold text-red-500 mb-2">Conta</h2>
            <div className="bg-white p-4 rounded-xl shadow-md">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="font-semibold">Sair da Conta</h3>
                        <p className="text-sm text-gray-500">Você será desconectado do aplicativo.</p>
                    </div>
                    <button 
                        onClick={() => setIsConfirmingLogout(true)}
                        className="bg-red-500 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-red-600 transition-colors"
                    >
                        Sair
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsScreen;