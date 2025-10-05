import { Session, User } from '@supabase/supabase-js';

export enum FitnessLevel {
  Beginner = 'Beginner',
  Intermediate = 'Intermediate',
  Advanced = 'Advanced',
}

export interface UserData {
  id: string;
  updated_at?: string;
  email?: string;
  fitness_goal?: string;
  fitness_level?: FitnessLevel;
  age?: number;
  current_weight?: number;
  goal_weight?: number;
  height?: number;
  has_onboarded?: boolean;
}

export interface AuthContextType {
  session: Session | null;
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  signOut: () => void;
  refetchUserData: () => Promise<void>;
}

export type Tab = 'Home' | 'AI Pose Detect' | 'Workouts' | 'Profile';

export interface Workout {
  id: string;
  title: string;
  category: string;
  videoId: string;
  thumbnail: string;
  // FIX: Added optional duration property to match data and resolve type errors.
  duration?: string;
}

export interface ChatMessage {
  sender: 'user' | 'assistant';
  text: string;
}

// For TensorFlow Pose Detection
export type Exercise = 'Pushups' | 'Squats';
