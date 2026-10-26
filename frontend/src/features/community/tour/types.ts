import type { Step } from 'react-joyride';

export type TourIconType = 'shield' | 'activity' | 'droplets' | 'alert' | 'bot' | 'bell' | 'compass';

export interface TourStepData {
  mission: string;
  badge: string;
  tip?: string;
  icon: TourIconType;
  route: string;
  targetSelector: string;
}

export type CommunityTourStep = Step & {
  data: TourStepData;
};

export interface TourStorageState {
  completed: boolean;
  dismissed: boolean;
  completedAt?: string;
  dismissedAt?: string;
}

export interface CommunityTourContextValue {
  isTourRunning: boolean;
  isWelcomeOpen: boolean;
  isCompletionOpen: boolean;
  currentStepIndex: number;
  startTour: () => void;
  stopTour: () => void;
  skipTour: () => void;
  finishTour: () => void;
  openWelcome: () => void;
  closeWelcome: () => void;
  replayTour: () => void;
}
