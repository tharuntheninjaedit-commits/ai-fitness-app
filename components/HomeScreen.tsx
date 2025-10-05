import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import ChatModal from './ChatModal';
import { DumbbellIcon, BotIcon } from './Icons';

interface HomeScreenProps {
  onDailyRoutineClick: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ onDailyRoutineClick }) => {
  const { userData } = useAuth();
  const [isChatOpen, setIsChatOpen] = useState(false);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="p-4 sm:p-6 text-white">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">{getGreeting()},</h1>
        <p className="text-2xl text-gray-300">{userData?.email?.split('@')[0] || 'Fitness Fan'}</p>
      </header>

      <section className="space-y-6">
        <div 
            onClick={onDailyRoutineClick}
            className="bg-gradient-to-br from-teal-500 to-cyan-600 p-6 rounded-xl shadow-lg cursor-pointer transition-transform hover:scale-105"
        >
          <div className="flex items-center mb-2">
            <DumbbellIcon className="w-6 h-6 mr-3"/>
            <h2 className="text-xl font-bold">Daily Routine</h2>
          </div>
          <p className="text-gray-200">Start your day with a quick and effective workout session.</p>
        </div>

        <div 
            onClick={() => setIsChatOpen(true)}
            className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-xl shadow-lg cursor-pointer transition-transform hover:scale-105"
        >
          <div className="flex items-center mb-2">
            <BotIcon className="w-6 h-6 mr-3"/>
            <h2 className="text-xl font-bold">AI Fitness Coach</h2>
          </div>
          <p className="text-gray-200">Have questions? Chat with your personal AI coach.</p>
        </div>
      </section>

      {isChatOpen && userData && <ChatModal userData={userData} onClose={() => setIsChatOpen(false)} />}
    </div>
  );
};

export default HomeScreen;