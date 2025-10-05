
import React from 'react';
import { Tab } from '../types';
import { HomeIcon, BarbellIcon, VideoIcon, UserIcon } from './Icons';

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const navItems: { name: Tab; icon: React.FC<any> }[] = [
  { name: 'Home', icon: HomeIcon },
  { name: 'AI Pose Detect', icon: BarbellIcon },
  { name: 'Workouts', icon: VideoIcon },
  { name: 'Profile', icon: UserIcon },
];

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-gray-800 border-t border-gray-700">
      <div className="flex justify-around h-16">
        {navItems.map((item) => {
          const isActive = activeTab === item.name;
          return (
            <button
              key={item.name}
              onClick={() => onTabChange(item.name)}
              className="flex flex-col items-center justify-center w-full text-xs transition-colors duration-200"
            >
              <item.icon className={`w-6 h-6 mb-1 ${isActive ? 'text-teal-400' : 'text-gray-400'}`} />
              <span className={isActive ? 'text-teal-400' : 'text-gray-400'}>{item.name === 'AI Pose Detect' ? 'Pose AI' : item.name}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
