import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getTourStatus, setTourCompleted, setTourDismissed, resetTourStatus } from './tourStorage';
import type { CommunityTourContextValue } from './types';

const CommunityTourContext = createContext<CommunityTourContextValue | null>(null);

export function CommunityTourProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isTourRunning, setIsTourRunning] = useState(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
  const [isCompletionOpen, setIsCompletionOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Check on initial appropriate visit if first time
  useEffect(() => {
    // Only check for Community role
    if (user && user.role !== 'community') {
      return;
    }

    const status = getTourStatus(user?.id);
    if (!status.completed && !status.dismissed) {
      // Delay slightly so the initial page layout settles smoothly
      const timer = setTimeout(() => {
        setIsWelcomeOpen(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const startTour = useCallback(() => {
    setIsWelcomeOpen(false);
    setIsCompletionOpen(false);
    setCurrentStepIndex(0);

    // If currently not on /community/home, navigate there first
    if (window.location.pathname !== '/community/home') {
      navigate('/community/home');
    }

    // Small delay to ensure route is settled before Joyride mounts
    setTimeout(() => {
      setIsTourRunning(true);
    }, 150);
  }, [navigate]);

  const stopTour = useCallback(() => {
    setIsTourRunning(false);
  }, []);

  const skipTour = useCallback(() => {
    setIsTourRunning(false);
    setIsWelcomeOpen(false);
    setIsCompletionOpen(false);
    setTourDismissed(user?.id);
  }, [user]);

  const finishTour = useCallback(() => {
    setIsTourRunning(false);
    setTourCompleted(user?.id);
    setIsCompletionOpen(true);
    if (window.location.pathname !== '/community/home') {
      navigate('/community/home');
    }
  }, [user, navigate]);

  const openWelcome = useCallback(() => {
    setIsWelcomeOpen(true);
  }, []);

  const closeWelcome = useCallback(() => {
    setIsWelcomeOpen(false);
    setTourDismissed(user?.id);
  }, [user]);

  const replayTour = useCallback(() => {
    resetTourStatus(user?.id);
    setIsCompletionOpen(false);
    startTour();
  }, [user, startTour]);

  const value = useMemo(
    () => ({
      isTourRunning,
      isWelcomeOpen,
      isCompletionOpen,
      currentStepIndex,
      startTour,
      stopTour,
      skipTour,
      finishTour,
      openWelcome,
      closeWelcome,
      replayTour,
    }),
    [
      isTourRunning,
      isWelcomeOpen,
      isCompletionOpen,
      currentStepIndex,
      startTour,
      stopTour,
      skipTour,
      finishTour,
      openWelcome,
      closeWelcome,
      replayTour,
    ]
  );

  return (
    <CommunityTourContext.Provider value={value}>
      {children}
    </CommunityTourContext.Provider>
  );
}

export function useCommunityTour() {
  const ctx = useContext(CommunityTourContext);
  if (!ctx) {
    throw new Error('useCommunityTour must be used within CommunityTourProvider');
  }
  return ctx;
}
