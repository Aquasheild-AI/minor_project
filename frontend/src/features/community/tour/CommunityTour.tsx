import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Joyride,
  ACTIONS,
  EVENTS,
  STATUS,
  type EventData,
} from 'react-joyride';
import { useCommunityTour } from './CommunityTourContext';
import { createCommunityTourSteps } from './tourSteps';
import { TourTooltip } from './TourTooltip';
import { TourWelcomeModal } from './TourWelcomeModal';
import { TourCompletionModal } from './TourCompletionModal';

export function CommunityTour() {
  const navigate = useNavigate();
  const {
    isTourRunning,
    isWelcomeOpen,
    isCompletionOpen,
    startTour,
    skipTour,
    finishTour,
    closeWelcome,
    replayTour,
  } = useCommunityTour();

  const [tourKey, setTourKey] = useState(0);

  // Re-generate steps with current navigate instance
  const steps = useMemo(() => createCommunityTourSteps(navigate), [navigate]);

  // When tour starts running, bump tourKey to ensure fresh uncontrolled state
  useEffect(() => {
    if (isTourRunning) {
      setTourKey((prev) => prev + 1);
    }
  }, [isTourRunning]);

  const handleJoyrideEvent = (data: EventData) => {
    const { action, status, type } = data;

    if (type === EVENTS.TOUR_END) {
      if (status === STATUS.FINISHED) {
        finishTour();
      } else if (
        status === STATUS.SKIPPED ||
        action === ACTIONS.SKIP ||
        action === ACTIONS.CLOSE
      ) {
        skipTour();
      }
    } else if (type === EVENTS.TARGET_NOT_FOUND) {
      console.warn('Community tour target not found for step:', data.index, data.step?.target);
      // In uncontrolled mode, Joyride skips automatically to next step
    }
  };

  return (
    <>
      {/* Welcome Modal */}
      <TourWelcomeModal
        open={isWelcomeOpen}
        onStart={startTour}
        onSkip={closeWelcome}
      />

      {/* Completion Modal */}
      <TourCompletionModal
        open={isCompletionOpen}
        onClose={() => skipTour()}
        onReplay={replayTour}
      />

      {/* React Joyride Tour */}
      <Joyride
        key={tourKey}
        steps={steps}
        run={isTourRunning}
        continuous
        scrollToFirstStep
        options={{
          skipBeacon: true,
          targetWaitTimeout: 3500,
          overlayColor: 'rgba(15, 23, 42, 0.65)',
          spotlightRadius: 12,
          spotlightPadding: 8,
          disableFocusTrap: false,
          blockTargetInteraction: false,
        }}
        styles={{
          overlay: {
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            transition: 'opacity 0.25s ease-out',
          },
        }}
        tooltipComponent={TourTooltip}
        onEvent={handleJoyrideEvent}
      />
    </>
  );
}
