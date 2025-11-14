
import React from 'react';

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ steps, currentStep }) => {
  return (
    <div className="flex justify-center items-center mb-8 w-full overflow-x-auto p-2">
      <div className="flex items-center">
      {steps.map((step, index) => (
        <React.Fragment key={index}>
          <div className="flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold transition-colors duration-300 ${
                index + 1 === currentStep
                  ? 'bg-brand-pink text-white scale-110'
                  : index + 1 < currentStep
                  ? 'bg-brand-pink-dark text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {index + 1 < currentStep ? '✔' : index + 1}
            </div>
            <p className={`mt-2 text-center text-sm ${index + 1 === currentStep ? 'text-brand-pink-dark font-bold' : 'text-gray-600'}`}>
              {step}
            </p>
          </div>
          {index < steps.length - 1 && (
            <div className={`flex-auto border-t-2 transition-colors duration-300 mx-2 w-8 sm:w-16 ${
              index + 1 < currentStep ? 'border-brand-pink-dark' : 'border-gray-200'
            }`}></div>
          )}
        </React.Fragment>
      ))}
      </div>
    </div>
  );
};

export default StepIndicator;
