import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { FitnessLevel } from '../types';
import { updateUserData } from '../services/supabase';

const OnboardingScreen: React.FC = () => {
  const [step, setStep] = useState(1);
  const { user, refetchUserData } = useAuth();

  // Form state
  const [fitnessGoal, setFitnessGoal] = useState('');
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel | null>(null);
  const [age, setAge] = useState('');
  const [currentWeight, setCurrentWeight] = useState('');
  const [goalWeight, setGoalWeight] = useState('');
  const [height, setHeight] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goals = ['Lose Weight', 'Build Muscle', 'Improve Endurance', 'Stay Fit'];

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    if (!fitnessLevel || !age || !currentWeight || !goalWeight || !height) {
        setError("Please fill out all fields.");
        setLoading(false);
        return;
    }

    try {
        const { data, error: updateError } = await updateUserData(user.id, {
            fitness_goal: fitnessGoal,
            fitness_level: fitnessLevel,
            age: parseInt(age),
            current_weight: parseFloat(currentWeight),
            goal_weight: parseFloat(goalWeight),
            height: parseFloat(height),
            has_onboarded: true,
        });
        
        if (updateError || !data) {
            setError(updateError?.message || "Failed to save profile. Please check your connection and try again.");
            setLoading(false);
            return;
        }

        // refetchUserData will cause the app to transition away from onboarding
        refetchUserData();

    } catch (e: any) {
        console.error("Onboarding submission failed:", e);
        setError(e.message || "An unexpected error occurred. Please try again.");
        setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-white">What's your primary fitness goal?</h2>
            <div className="grid grid-cols-2 gap-4">
              {goals.map(goal => (
                <button key={goal} onClick={() => { setFitnessGoal(goal); nextStep(); }} className="p-4 bg-gray-700 rounded-lg text-white font-semibold hover:bg-teal-500 transition">
                  {goal}
                </button>
              ))}
            </div>
          </div>
        );
      case 2:
        return (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-white">What's your fitness level?</h2>
            <div className="flex flex-col space-y-4">
              {Object.values(FitnessLevel).map(level => (
                <button key={level} onClick={() => { setFitnessLevel(level); nextStep(); }} className="p-4 bg-gray-700 rounded-lg text-white font-semibold hover:bg-teal-500 transition">
                  {level}
                </button>
              ))}
            </div>
             <button onClick={prevStep} className="mt-6 text-teal-400">Back</button>
          </div>
        );
      case 3:
        return (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-white">Tell us about yourself</h2>
            {error && <p className="bg-red-500/20 text-red-400 text-sm p-3 rounded-md mb-4">{error}</p>}
            <div className="space-y-4">
              <input type="number" placeholder="Age" value={age} onChange={e => setAge(e.target.value)} className="w-full p-3 bg-gray-700 rounded-md text-white border border-gray-600" />
              <input type="number" placeholder="Current Weight (kg)" value={currentWeight} onChange={e => setCurrentWeight(e.target.value)} className="w-full p-3 bg-gray-700 rounded-md text-white border border-gray-600" />
              <input type="number" placeholder="Goal Weight (kg)" value={goalWeight} onChange={e => setGoalWeight(e.target.value)} className="w-full p-3 bg-gray-700 rounded-md text-white border border-gray-600" />
              <input type="number" placeholder="Height (cm)" value={height} onChange={e => setHeight(e.target.value)} className="w-full p-3 bg-gray-700 rounded-md text-white border border-gray-600" />
            </div>
            <div className="flex justify-between mt-6">
                <button onClick={prevStep} className="text-teal-400">Back</button>
                <button onClick={handleSubmit} disabled={!age || !currentWeight || !goalWeight || !height || loading} className="px-6 py-2 bg-teal-500 rounded-md font-semibold text-white hover:bg-teal-600 disabled:bg-gray-500">
                  {loading ? 'Saving...' : 'Finish'}
                </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6">
            <div className="w-full bg-gray-700 rounded-full h-2.5">
                <div className="bg-teal-400 h-2.5 rounded-full" style={{ width: `${(step / 3) * 100}%` }}></div>
            </div>
        </div>
        {renderStep()}
      </div>
    </div>
  );
};

export default OnboardingScreen;