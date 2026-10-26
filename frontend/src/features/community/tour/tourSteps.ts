import type { NavigateFunction } from 'react-router-dom';
import type { CommunityTourStep } from './types';
import i18n from '@/i18n';

export function waitForTarget(selector: string, timeout = 3500): Promise<Element | null> {
  return new Promise((resolve) => {
    const existing = document.querySelector(selector);
    if (existing) {
      return resolve(existing);
    }

    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        observer.disconnect();
        clearTimeout(timer);
        resolve(el);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    const timer = setTimeout(() => {
      observer.disconnect();
      resolve(document.querySelector(selector));
    }, timeout);
  });
}

export function createCommunityTourSteps(navigate: NavigateFunction): CommunityTourStep[] {
  return [
    // Step 1: Village Water Safety & Health Overview (Dashboard)
    {
      target: '[data-tour="dashboard-risk-card"]',
      placement: 'bottom',
      title: i18n.t('tour.steps.step1Title'),
      content: i18n.t('tour.steps.step1Content'),
      data: {
        mission: i18n.t('tour.steps.step1Mission'),
        badge: 'Step 1 of 7',
        tip: i18n.t('tour.steps.step1Tip'),
        icon: 'shield' as const,
        route: '/community/home',
        targetSelector: '[data-tour="dashboard-risk-card"]',
      },
      before: async () => {
        if (window.location.pathname !== '/community/home') {
          navigate('/community/home');
          await waitForTarget('[data-tour="dashboard-risk-card"]', 3500);
        }
      },
    },

    // Step 2: Quick Actions & Symptom Reporting
    {
      target: '[data-tour="dashboard-quick-actions"]',
      placement: 'top',
      title: i18n.t('tour.steps.step2Title'),
      content: i18n.t('tour.steps.step2Content'),
      data: {
        mission: i18n.t('tour.steps.step2Mission'),
        badge: 'Step 2 of 7',
        tip: i18n.t('tour.steps.step2Tip'),
        icon: 'activity' as const,
        route: '/community/home',
        targetSelector: '[data-tour="dashboard-quick-actions"]',
      },
      before: async () => {
        if (window.location.pathname !== '/community/home') {
          navigate('/community/home');
          await waitForTarget('[data-tour="dashboard-quick-actions"]', 3500);
        }
      },
    },

    // Step 3: Water Quality Monitoring
    {
      target: '[data-tour="water-quality-cards"]',
      placement: 'bottom',
      title: i18n.t('tour.steps.step3Title'),
      content: i18n.t('tour.steps.step3Content'),
      data: {
        mission: i18n.t('tour.steps.step3Mission'),
        badge: 'Step 3 of 7',
        tip: i18n.t('tour.steps.step3Tip'),
        icon: 'droplets' as const,
        route: '/community/water-quality',
        targetSelector: '[data-tour="water-quality-cards"]',
      },
      before: async () => {
        if (window.location.pathname !== '/community/water-quality') {
          navigate('/community/water-quality');
          await waitForTarget('[data-tour="water-quality-cards"]', 3500);
        }
      },
    },

    // Step 4: AI Disease Risk & Water Advisory
    {
      target: '[data-tour="risk-advisory-section"]',
      placement: 'bottom',
      title: i18n.t('tour.steps.step4Title'),
      content: i18n.t('tour.steps.step4Content'),
      data: {
        mission: i18n.t('tour.steps.step4Mission'),
        badge: 'Step 4 of 7',
        tip: i18n.t('tour.steps.step4Tip'),
        icon: 'alert' as const,
        route: '/community/risk',
        targetSelector: '[data-tour="risk-advisory-section"]',
      },
      before: async () => {
        if (window.location.pathname !== '/community/risk') {
          navigate('/community/risk');
          await waitForTarget('[data-tour="risk-advisory-section"]', 3500);
        }
      },
    },

    // Step 5: AI Health Assistant
    {
      target: '[data-tour="chatbot-interface"]',
      placement: 'bottom',
      title: i18n.t('tour.steps.step5Title'),
      content: i18n.t('tour.steps.step5Content'),
      data: {
        mission: i18n.t('tour.steps.step5Mission'),
        badge: 'Step 5 of 7',
        tip: i18n.t('tour.steps.step5Tip'),
        icon: 'bot' as const,
        route: '/community/chat',
        targetSelector: '[data-tour="chatbot-interface"]',
      },
      before: async () => {
        if (window.location.pathname !== '/community/chat') {
          navigate('/community/chat');
          await waitForTarget('[data-tour="chatbot-interface"]', 3500);
        }
      },
    },

    // Step 6: Alerts & Notifications
    {
      target: '[data-tour="notifications-bell"]',
      placement: 'bottom-end',
      title: i18n.t('tour.steps.step6Title'),
      content: i18n.t('tour.steps.step6Content'),
      data: {
        mission: i18n.t('tour.steps.step6Mission'),
        badge: 'Step 6 of 7',
        tip: i18n.t('tour.steps.step6Tip'),
        icon: 'bell' as const,
        route: '/community/home',
        targetSelector: '[data-tour="notifications-bell"]',
      },
      before: async () => {
        if (window.location.pathname !== '/community/home') {
          navigate('/community/home');
          await waitForTarget('[data-tour="notifications-bell"]', 3500);
        }
      },
    },

    // Step 7: Navigation & Tour Replay
    {
      target: '[data-tour="tour-help-button"]',
      placement: 'bottom-end',
      title: i18n.t('tour.steps.step7Title'),
      content: i18n.t('tour.steps.step7Content'),
      data: {
        mission: i18n.t('tour.steps.step7Mission'),
        badge: 'Step 7 of 7',
        tip: i18n.t('tour.steps.step7Tip'),
        icon: 'compass' as const,
        route: '/community/home',
        targetSelector: '[data-tour="tour-help-button"]',
      },
      before: async () => {
        if (window.location.pathname !== '/community/home') {
          navigate('/community/home');
          await waitForTarget('[data-tour="tour-help-button"]', 3500);
        }
      },
    },
  ];
}
