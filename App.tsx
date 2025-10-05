import React, { useState, useCallback } from 'react';
import { useAuth } from './hooks/useAuth';
import { Tab } from './types';
import AuthScreen from './components/AuthScreen';
import OnboardingScreen from './components/OnboardingScreen';
import HomeScreen from './components/HomeScreen';
import PoseDetectScreen from './components/PoseDetectScreen';
import WorkoutsScreen from './components/WorkoutsScreen';
import ProfileScreen from './components/ProfileScreen';
import BottomNav from './components/BottomNav';
import Spinner from './components/Spinner';

const App: React.FC = () => {
  const { session, userData, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('Home');
  const [activeWorkoutCategory, setActiveWorkoutCategory] = useState<string | null>(null);

  const handleTabChange = useCallback((tab: Tab) => {
    setActiveTab(tab);
  }, []);

  const handleDailyRoutineClick = useCallback(() => {
    setActiveWorkoutCategory("Daily Routine");
    setActiveTab("Workouts");
  }, []);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-screen bg-gray-900">
          <Spinner />
        </div>
      );
    }

    if (!session) {
      return <AuthScreen />;
    }

    if (!userData || !userData.has_onboarded) {
      return <OnboardingScreen />;
    }

    const CurrentScreen = () => {
        switch (activeTab) {
            case 'Home':
                return <HomeScreen onDailyRoutineClick={handleDailyRoutineClick} />;
            case 'AI Pose Detect':
                return <PoseDetectScreen />;
            case 'Workouts':
                return <WorkoutsScreen initialCategory={activeWorkoutCategory} />;
            case 'Profile':
                return <ProfileScreen />;
            default:
                return <HomeScreen onDailyRoutineClick={handleDailyRoutineClick} />;
        }
    }

    return (
        <div className="h-screen w-full flex flex-col font-sans max-w-md mx-auto bg-gray-900 shadow-2xl">
          <main className="flex-1 overflow-y-auto pb-20">
              <CurrentScreen />
          </main>
          <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
        </div>
    );
  };

  return <div className="bg-black min-h-screen">{renderContent()}</div>;
};

export default App;