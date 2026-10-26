import type { TourStorageState } from './types';

const STORAGE_PREFIX = 'aquashield_community_tour_v1';

const getStorageKey = (userId?: string | number): string => {
  if (userId) {
    return `${STORAGE_PREFIX}_user_${userId}`;
  }
  return `${STORAGE_PREFIX}_global`;
};

export const getTourStatus = (userId?: string | number): TourStorageState => {
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (!raw) {
      return { completed: false, dismissed: false };
    }
    const parsed = JSON.parse(raw);
    return {
      completed: Boolean(parsed.completed),
      dismissed: Boolean(parsed.dismissed),
      completedAt: parsed.completedAt,
      dismissedAt: parsed.dismissedAt,
    };
  } catch (err) {
    console.warn('Failed to read tour status from localStorage:', err);
    return { completed: false, dismissed: false };
  }
};

export const setTourCompleted = (userId?: string | number): void => {
  try {
    const state: TourStorageState = {
      completed: true,
      dismissed: false,
      completedAt: new Date().toISOString(),
    };
    localStorage.setItem(getStorageKey(userId), JSON.stringify(state));
  } catch (err) {
    console.warn('Failed to save tour completion to localStorage:', err);
  }
};

export const setTourDismissed = (userId?: string | number): void => {
  try {
    const state: TourStorageState = {
      completed: false,
      dismissed: true,
      dismissedAt: new Date().toISOString(),
    };
    localStorage.setItem(getStorageKey(userId), JSON.stringify(state));
  } catch (err) {
    console.warn('Failed to save tour dismissal to localStorage:', err);
  }
};

export const resetTourStatus = (userId?: string | number): void => {
  try {
    localStorage.removeItem(getStorageKey(userId));
  } catch (err) {
    console.warn('Failed to reset tour status in localStorage:', err);
  }
};
