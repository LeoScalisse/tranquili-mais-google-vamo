
import React from 'react';
import { UserProfile, Screen } from '../types';
import { SettingsIcon, LogOutIcon, X } from './ui/Icons';
import { playSound } from '../services/soundService';

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
  userEmail?: string;
  onNavigate: (screen: Screen) => void;
  onLogout: () => void;
}

const SideMenu: React.FC<SideMenuProps> = ({ isOpen, onClose, userProfile, userEmail, onNavigate, onLogout }) => {

  const handleNavigate = (screen: Screen) => {
    playSound('navigation');
    onNavigate(screen);
  }

  const handleLogout = () => {
    playSound('confirm');
    onLogout();
  }

  if (!userProfile) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] transition-opacity duration-300 ease-in-out ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="menu-title"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Menu Panel */}
      <div
        className={`relative flex flex-col h-full w-72 max-w-[80vw] bg-white shadow-xl transition-transform duration-300 ease-in-out ${
          isOpen ? 'transform translate-x-0' : 'transform -translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 id="menu-title" className="text-lg font-bold text-gray-800">Menu</h2>
          <button onClick={onClose} className="p-1 text-gray-500 rounded-full hover:bg-gray-100" aria-label="Fechar menu">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* User Profile */}
        <div className="p-4 border-b">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#38b6ff] to-blue-200 flex items-center justify-center text-white text-3xl font-bold mb-3">
                {userProfile?.name?.charAt(0).toUpperCase() || '?'}
            </div>
            <h3 className="font-bold text-gray-800 truncate">{userProfile?.name || 'Usuário'}</h3>
            <p className="text-sm text-gray-500 truncate">{userEmail || 'Convidado'}</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
            <button
                onClick={() => handleNavigate(Screen.Settings)}
                className="w-full flex items-center gap-3 px-3 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
                <SettingsIcon className="w-5 h-5" />
                <span className="font-medium">Configurações</span>
            </button>
        </nav>

        {/* Footer / Logout */}
        <div className="p-4 border-t">
            <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
                <LogOutIcon className="w-5 h-5" />
                <span className="font-medium">Sair</span>
            </button>
        </div>
      </div>
    </div>
  );
};

export default SideMenu;
