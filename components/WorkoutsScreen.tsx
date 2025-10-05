import React, { useState, useEffect, useCallback } from 'react';
import { WORKOUT_CATEGORIES } from '../constants';
import { fetchWorkoutVideos } from '../services/youtubeService';
import { Workout } from '../types';
import { PlayIcon, SparklesIcon } from './Icons';
import { useAuth } from '../hooks/useAuth';
import { generateWorkoutPlan } from '../services/gemini';
import Spinner from './Spinner';
import WorkoutPlayer from './WorkoutPlayer';


interface WorkoutsScreenProps {
    initialCategory?: string | null;
}

interface SuggestedPlan {
    day: string;
    workout: Workout;
}

const WorkoutsScreen: React.FC<WorkoutsScreenProps> = ({ initialCategory }) => {
    const { userData } = useAuth();
    const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || 'Daily Routine');
    const [playingVideo, setPlayingVideo] = useState<Workout | null>(null);
    const [suggestedPlan, setSuggestedPlan] = useState<SuggestedPlan[] | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationError, setGenerationError] = useState<string | null>(null);

    const [workouts, setWorkouts] = useState<Workout[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if(initialCategory) {
            setSelectedCategory(initialCategory);
        }
    }, [initialCategory]);

    useEffect(() => {
        const loadWorkouts = async () => {
            setIsLoading(true);
            setError(null);
            setWorkouts([]);
            try {
                const fetchedWorkouts = await fetchWorkoutVideos(selectedCategory);
                if (fetchedWorkouts.length === 0) {
                    setError("No workouts found for this category. Please try another one!");
                }
                setWorkouts(fetchedWorkouts);
            } catch (err) {
                setError("Failed to load workouts. Please check your connection.");
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        loadWorkouts();
    }, [selectedCategory]);
    
    const handleGeneratePlan = async () => {
        if (!userData) return;
        setIsGenerating(true);
        setGenerationError(null);
        setSuggestedPlan(null);
    
        try {
            const allWorkoutsPromises = WORKOUT_CATEGORIES.map(category => fetchWorkoutVideos(category));
            const workoutsByCategories = await Promise.all(allWorkoutsPromises);
            const allWorkouts = workoutsByCategories.flat();

            if (allWorkouts.length === 0) {
                throw new Error("Could not fetch workouts to build a plan. Please check your connection.");
            }

            const planResponse = await generateWorkoutPlan(userData, allWorkouts);
    
            const planWithWorkouts: SuggestedPlan[] = planResponse
                .map(planItem => {
                    const workout = allWorkouts.find(v => v.title === planItem.workoutTitle);
                    return workout ? { day: planItem.day, workout } : null;
                })
                .filter((item): item is SuggestedPlan => item !== null);
                
            if (planWithWorkouts.length === 0) {
                 throw new Error("AI couldn't create a suitable plan. Please try regenerating.");
            }
    
            setSuggestedPlan(planWithWorkouts);
        } catch (error) {
            console.error("Error generating workout plan:", error);
            setGenerationError(error instanceof Error ? error.message : "An unexpected error occurred.");
        } finally {
            setIsGenerating(false);
        }
    };

    const renderWorkoutList = () => {
        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                    <Spinner />
                    <p className="mt-4 text-gray-400">Fetching workouts...</p>
                </div>
            );
        }

        if (error) {
            return <p className="text-center text-red-400 p-4 bg-red-900/20 rounded-lg">{error}</p>;
        }

        if (workouts.length === 0) {
            return <p className="text-center text-gray-400 p-4">No workouts available for this category.</p>;
        }

        return (
            <div className="space-y-4">
                {workouts.map(workout => (
                    <div key={workout.id} className="bg-gray-800 rounded-lg overflow-hidden flex cursor-pointer hover:bg-gray-700/80 transition" onClick={() => setPlayingVideo(workout)}>
                        <div className="relative w-2/5">
                             <img src={workout.thumbnail} alt={workout.title} className="w-full h-full object-cover" loading="lazy" />
                             <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                 <PlayIcon className="w-8 h-8 text-white"/>
                             </div>
                        </div>
                        <div className="p-4 w-3/5">
                            <h3 className="font-bold text-md text-white leading-tight">{workout.title}</h3>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="p-4">
            <h1 className="text-3xl font-bold mb-4">Workouts</h1>

            <section className="mb-8 bg-gray-800 p-4 rounded-xl shadow-lg">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-white">Your AI-Powered Plan</h2>
                        <p className="text-gray-400 text-sm">Get a weekly plan tailored to you.</p>
                    </div>
                    <button 
                        onClick={handleGeneratePlan} 
                        disabled={isGenerating}
                        className="bg-teal-500 text-white font-bold py-1 px-3 text-sm rounded-lg hover:bg-teal-600 transition disabled:bg-teal-800 disabled:cursor-not-allowed flex items-center"
                    >
                        <SparklesIcon className="w-5 h-5 mr-2"/>
                        {isGenerating ? 'Generating...' : (suggestedPlan ? 'Regenerate' : 'Generate Plan')}
                    </button>
                </div>

                {isGenerating && (
                    <div className="flex justify-center items-center mt-6 p-4 bg-gray-700/50 rounded-lg">
                        <Spinner />
                        <p className="ml-3 text-gray-300">Crafting your perfect week...</p>
                    </div>
                )}

                {generationError && <p className="text-red-400 mt-4 text-center p-3 bg-red-500/10 rounded-lg">{generationError}</p>}
                
                {suggestedPlan && (
                    <div className="mt-4 space-y-3">
                        {suggestedPlan.map((item, index) => (
                            <div key={index} className="bg-gray-700 rounded-lg p-3 flex items-center justify-between cursor-pointer hover:bg-gray-600/80 transition" onClick={() => setPlayingVideo(item.workout)}>
                                <div className="flex items-center overflow-hidden">
                                    <img src={item.workout.thumbnail} alt={item.workout.title} className="w-20 h-12 object-cover rounded-md mr-4" loading="lazy" />
                                    <div className="flex-1 truncate">
                                        <p className="font-semibold text-teal-400">{item.day}</p>
                                        <h3 className="font-medium text-white truncate">{item.workout.title}</h3>
                                    </div>
                                </div>
                                <PlayIcon className="w-6 h-6 text-gray-400 flex-shrink-0 ml-2"/>
                            </div>
                        ))}
                    </div>
                )}
            </section>
            
            <h2 className="text-2xl font-bold mb-4">Browse Categories</h2>
            <div className="flex space-x-2 overflow-x-auto pb-4 mb-4 -mx-4 px-4">
                {WORKOUT_CATEGORIES.map(category => (
                    <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`px-4 py-2 rounded-full font-semibold transition whitespace-nowrap ${selectedCategory === category ? 'bg-teal-500 text-white' : 'bg-gray-700 text-gray-300'}`}
                    >
                        {category}
                    </button>
                ))}
            </div>

            {renderWorkoutList()}

            {playingVideo && <WorkoutPlayer video={playingVideo} onClose={() => setPlayingVideo(null)} />}
        </div>
    );
};

export default WorkoutsScreen;