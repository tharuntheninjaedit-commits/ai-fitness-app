import { GoogleGenAI, Chat, Type } from "@google/genai";
import { UserData, ChatMessage, Workout } from '../types';

// FIX: Per @google/genai guidelines, initialize directly and assume API_KEY is present.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
let chat: Chat | null = null;

const initializeChat = (userData: UserData) => {
    const systemInstruction = `You are an expert AI Fitness Coach. Your user's profile is as follows:
- Fitness Goal: ${userData.fitness_goal || 'Not set'}
- Fitness Level: ${userData.fitness_level || 'Not set'}
- Age: ${userData.age || 'Not set'}
- Current Weight (kg): ${userData.current_weight || 'Not set'}
- Goal Weight (kg): ${userData.goal_weight || 'Not set'}
- Height (cm): ${userData.height || 'Not set'}

Your role is to provide encouraging, helpful, and safe fitness advice. Keep your responses concise and motivational. Base your advice on the user's profile. Do not give medical advice.`;

    chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction,
        },
    });
};

export const generateChatResponseStream = async (
    newMessage: string,
    history: ChatMessage[],
    userData: UserData
) => {
    // FIX: Removed redundant API_KEY check to align with guidelines.
    try {
        if (!chat) {
            initializeChat(userData);
        }
        
        const response = await chat!.sendMessageStream({ message: newMessage });
        return response;

    } catch (error) {
        console.error("Error generating chat response from Gemini:", error);
        chat = null; // Reset chat on error
        throw new Error("I'm having some trouble connecting. Please try again later.");
    }
};

export const generateWorkoutPlan = async (
    userData: UserData,
    workouts: Workout[]
): Promise<{ day: string; workoutTitle: string }[]> => {
    // FIX: Removed redundant API_KEY check to align with guidelines.
    const workoutList = workouts.map(w => ({ title: w.title, category: w.category }));

    const systemInstruction = `You are an expert AI Fitness Coach. Your task is to create a personalized 5-day workout plan for a user based on their profile and a list of available workout videos.

User Profile:
- Fitness Goal: ${userData.fitness_goal || 'Not specified'}
- Fitness Level: ${userData.fitness_level || 'Not specified'}

Instructions:
1. Analyze the user's goal and fitness level.
2. Select 5 suitable workouts from the provided list to create a balanced weekly plan.
3. For 'Lose Weight' or 'Improve Endurance', prioritize Cardio and HIIT.
4. For 'Build Muscle', prioritize Strength.
5. For 'Stay Fit', provide a mix of Strength, Cardio, and Yoga/Stretching.
6. Ensure the plan is appropriate for the user's fitness level (e.g., shorter, less intense workouts for Beginners).
7. Return the plan as a JSON object that strictly adheres to the provided schema. The 'workoutTitle' must be an exact match from the list.`;

    const prompt = `Here is the list of available workouts in JSON format: ${JSON.stringify(workoutList)}. Please generate the 5-day workout plan.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    description: "A 5-day workout plan.",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            day: {
                                type: Type.STRING,
                                description: "The day of the week for the workout (e.g., 'Day 1')."
                            },
                            workoutTitle: {
                                type: Type.STRING,
                                description: "The exact title of the workout video from the provided list."
                            }
                        },
                        required: ["day", "workoutTitle"],
                    }
                },
            },
        });

        const jsonStr = response.text.trim();
        const plan = JSON.parse(jsonStr);
        return plan;

    } catch (error) {
        console.error("Error generating workout plan from Gemini:", error);
        throw new Error("I had trouble creating a plan for you. Please try again.");
    }
};
