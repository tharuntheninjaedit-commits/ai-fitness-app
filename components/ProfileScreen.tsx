import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { updateUserData } from '../services/supabase';
import { UserData, FitnessLevel } from '../types';

const ProfileScreen: React.FC = () => {
  const { user, userData, signOut, refetchUserData } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<UserData>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userData) {
      setFormData({
        fitness_goal: userData.fitness_goal,
        fitness_level: userData.fitness_level,
        age: userData.age,
        current_weight: userData.current_weight,
        goal_weight: userData.goal_weight,
        height: userData.height,
      });
    }
  }, [userData, isEditing]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
        const updates = {
            ...formData,
            age: formData.age ? parseInt(String(formData.age), 10) : null,
            current_weight: formData.current_weight ? parseFloat(String(formData.current_weight)) : null,
            goal_weight: formData.goal_weight ? parseFloat(String(formData.goal_weight)) : null,
            height: formData.height ? parseFloat(String(formData.height)) : null,
        };
        const { error: updateError } = await updateUserData(user.id, updates);
        if (updateError) {
            throw new Error(updateError.message);
        }
        await refetchUserData();
        setIsEditing(false);
    } catch (e: any) {
        setError(e.message || "An unexpected error occurred. Please try again.");
    } finally {
        setLoading(false);
    }
  };
  
  const InfoRow: React.FC<{label: string, value: any, name: keyof UserData, type?: string, options?: string[], unit?: string}> = ({label, value, name, type='text', options, unit}) => (
    <div className="flex justify-between items-center py-3">
        <span className="text-gray-400">{label}</span>
        {isEditing ? (
            type === 'select' && options ? (
                // FIX: Cast value to string to satisfy the `value` prop type which cannot be a boolean.
                <select name={name} value={String(formData[name] ?? '')} onChange={handleInputChange} className="w-1/2 p-1 bg-gray-600 rounded-md text-white text-right">
                    {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
            ) : (
                // FIX: Cast value to string to satisfy the `value` prop type which cannot be a boolean.
                <input type={type} name={name} value={String(formData[name] ?? '')} onChange={handleInputChange} className="w-1/2 p-1 bg-gray-600 rounded-md text-white text-right" />
            )
        ) : (
            <span className="font-semibold text-white">{value != null ? `${value}${unit ? ` ${unit}` : ''}` : 'N/A'}</span>
        )}
    </div>
  );


  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-6">Profile</h1>
      
      {error && <p className="bg-red-500/20 text-red-400 text-sm p-3 rounded-md mb-4 text-center">{error}</p>}

      <div className="bg-gray-800 p-6 rounded-lg mb-6">
        <h2 className="text-xl font-bold mb-4">Account</h2>
        <div className="flex justify-between items-center py-3">
          <span className="text-gray-400">Email</span>
          <span className="font-semibold text-white">{user?.email}</span>
        </div>
        <div className="border-t border-gray-700 my-2"></div>
        <h2 className="text-xl font-bold mb-2 mt-4">Fitness Details</h2>
         <InfoRow label="Fitness Goal" value={userData?.fitness_goal} name="fitness_goal" type="text" />
        <div className="border-t border-gray-700 my-1"></div>
         <InfoRow label="Fitness Level" value={userData?.fitness_level} name="fitness_level" type="select" options={Object.values(FitnessLevel)} />
        <div className="border-t border-gray-700 my-1"></div>
         <InfoRow label="Age" value={userData?.age} name="age" type="number" />
        <div className="border-t border-gray-700 my-1"></div>
         <InfoRow label="Current Weight" value={userData?.current_weight} name="current_weight" type="number" unit="kg" />
        <div className="border-t border-gray-700 my-1"></div>
         <InfoRow label="Goal Weight" value={userData?.goal_weight} name="goal_weight" type="number" unit="kg" />
        <div className="border-t border-gray-700 my-1"></div>
         <InfoRow label="Height" value={userData?.height} name="height" type="number" unit="cm" />
      </div>

      {isEditing ? (
          <div className="flex gap-4">
            <button onClick={() => { setIsEditing(false); setError(null); }} className="flex-1 bg-gray-600 text-white font-bold py-3 rounded-lg hover:bg-gray-700 transition">Cancel</button>
            <button onClick={handleSave} disabled={loading} className="flex-1 bg-teal-500 text-white font-bold py-3 rounded-lg hover:bg-teal-600 transition disabled:bg-teal-800">
                {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
      ) : (
          <button onClick={() => setIsEditing(true)} className="w-full bg-teal-500 text-white font-bold py-3 rounded-lg hover:bg-teal-600 transition">
              Edit Profile
          </button>
      )}

      <button
        onClick={signOut}
        className="w-full bg-red-500 text-white font-bold py-3 rounded-lg hover:bg-red-600 transition mt-4"
      >
        Sign Out
      </button>
    </div>
  );
};

export default ProfileScreen;