import React from 'react';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  labels?: string[] | null;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, totalSteps, labels }) => {
  // Defensive: ensure we always have an array to map over
  const safeLabels = Array.isArray(labels) && labels.length > 0
    ? labels
    : Array.from({ length: totalSteps }, (_, i) => `Step ${i + 1}`);

  return (
    <div className="flex items-center gap-3 mb-6">
      {safeLabels.map((label, idx) => {
        const stepNum = idx + 1;
        const isActive = stepNum === currentStep;
        return (
          <div key={idx} className={`flex-1 text-center py-2 rounded ${isActive ? 'bg-brand-pink text-white font-bold' : 'bg-white text-gray-600 border'}`}>
            <div className="text-sm">{label}</div>
            <div className="text-xs mt-1">{stepNum}/{totalSteps}</div>
          </div>
        );
      })}
    </div>
  );
};

export default StepIndicator;
