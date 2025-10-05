import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, getUserData } from '../services/supabase';
import { UserData, AuthContextType } from '../types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CACHED_USER_DATA_KEY = 'fitai-user-data';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const [userData, setUserData] = useState<UserData | null>(() => {
    try {
      const cachedData = localStorage.getItem(CACHED_USER_DATA_KEY);
      return cachedData ? JSON.parse(cachedData) : null;
    } catch (error) {
      console.error("Failed to parse cached user data:", error);
      return null;
    }
  });

  const [loading, setLoading] = useState(!userData);

  const fetchUserData = useCallback(async (user: User | null) => {
    if (user) {
      let profile = await getUserData(user.id);

      // If no profile exists, this is a new user. Create a stub profile.
      if (!profile) {
        const { data: newProfile, error } = await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email,
            has_onboarded: false
          })
          .select()
          .single();
        
        if (error) {
          console.error('[Auth] Error creating stub user profile:', error);
        } else {
          profile = newProfile;
        }
      }
      setUserData(profile);
      if (profile) {
        localStorage.setItem(CACHED_USER_DATA_KEY, JSON.stringify(profile));
      } else {
        localStorage.removeItem(CACHED_USER_DATA_KEY);
      }
    } else {
      setUserData(null);
      localStorage.removeItem(CACHED_USER_DATA_KEY);
    }
  }, []);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        await fetchUserData(currentUser);
      } catch (error) {
        console.error("[Auth] Error during auth state change:", error);
      } finally {
        if (loading) {
          setLoading(false);
        }
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchUserData, loading]);

  const signOut = () => {
    localStorage.removeItem(CACHED_USER_DATA_KEY);
    setUserData(null);
    setSession(null);
    setUser(null);
    supabase.auth.signOut();
  };
  
  const refetchUserData = useCallback(async () => {
    if(user) {
      await fetchUserData(user);
    }
  },[user, fetchUserData]);

  const value = {
    session,
    user,
    userData,
    loading,
    signOut,
    refetchUserData
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
