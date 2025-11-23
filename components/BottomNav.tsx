import React from 'react';
import { AppSettings, Screen } from '../types';
import { ICON_SETS } from '../constants';
import { playSound } from '../services/soundService';

interface BottomNavProps {
  activeScreen: Screen;
  setActiveScreen: (screen: Screen) => void;
  settings: AppSettings;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeScreen, setActiveScreen, settings }) => {
  const currentIcons = ICON_SETS[settings.iconSet] || ICON_SETS.default;

  const navItems = [
    { screen: Screen.Home, label: 'Home', icon: currentIcons.home },
    { screen: Screen.Chat, label: 'Chat', icon: currentIcons.chat },
    { screen: Screen.Gratitude, label: 'Diário', icon: currentIcons.gratitude },
    { screen: Screen.News, label: 'Novidades', icon: currentIcons.news },
    { screen: Screen.Games, label: 'Games', icon: currentIcons.games },
    { screen: Screen.Reports, label: 'Evolução', icon: currentIcons.reports },
    { screen: Screen.Settings, label: 'Config', icon: currentIcons.settings },
  ];

  const handleNavClick = (screen: Screen) => {
    playSound('navigation');
    setActiveScreen(screen);
  };

  return (
    // Centering the floating navigation bar near the bottom
    <nav className="fixed bottom-4 left-0 right-0 h-16 flex justify-center items-center z-50 px-2 pointer-events-none">
      <div 
        className="bg-white/80 backdrop-blur-lg border border-gray-200/80 rounded-2xl p-1.5 flex justify-between items-center shadow-xl space-x-1 pointer-events-auto max-w-full overflow-x-auto no-scrollbar"
        role="tablist"
        aria-orientation="horizontal"
      >
        {navItems.map((item) => {
          const isActive = activeScreen === item.screen;
          return (
            <button
              key={item.label}
              onClick={() => handleNavClick(item.screen)}
              role="tab"
              aria-selected={isActive}
              aria-controls={`screen-${item.label}`}
              className={`
                flex items-center justify-center rounded-xl h-11 transition-all duration-300 ease-in-out
                ${isActive ? 'bg-blue-50 text-[#38b6ff] px-3' : 'px-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700'}
              `}
              aria-label={item.label}
            >
              {item.icon}
              <span
                aria-hidden={!isActive}
                className={`
                  text-xs font-medium overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out
                  ${isActive ? 'max-w-20 ml-2 opacity-100' : 'max-w-0 ml-0 opacity-0'}
                `}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;