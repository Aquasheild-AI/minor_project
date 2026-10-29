import React from 'react';

interface VoiceWaveformProps {
  variant?: 'listening' | 'speaking';
  className?: string;
}

export const VoiceWaveform: React.FC<VoiceWaveformProps> = ({
  variant = 'listening',
  className = '',
}) => {
  const isListening = variant === 'listening';

  return (
    <div
      className={`flex items-center gap-1 h-6 px-1.5 ${className}`}
      aria-hidden="true"
    >
      <span
        className={`w-1 rounded-full animate-[pulse_0.75s_ease-in-out_infinite] ${
          isListening ? 'bg-red-500 h-3' : 'bg-primary-600 h-2'
        }`}
      />
      <span
        className={`w-1 rounded-full animate-[pulse_0.55s_ease-in-out_infinite_0.1s] ${
          isListening ? 'bg-red-500 h-5' : 'bg-primary-600 h-4'
        }`}
      />
      <span
        className={`w-1 rounded-full animate-[pulse_0.85s_ease-in-out_infinite_0.2s] ${
          isListening ? 'bg-red-600 h-6' : 'bg-primary-600 h-5'
        }`}
      />
      <span
        className={`w-1 rounded-full animate-[pulse_0.6s_ease-in-out_infinite_0.15s] ${
          isListening ? 'bg-red-500 h-4' : 'bg-primary-600 h-3'
        }`}
      />
      <span
        className={`w-1 rounded-full animate-[pulse_0.8s_ease-in-out_infinite_0.25s] ${
          isListening ? 'bg-red-500 h-2.5' : 'bg-primary-600 h-2'
        }`}
      />
    </div>
  );
};

