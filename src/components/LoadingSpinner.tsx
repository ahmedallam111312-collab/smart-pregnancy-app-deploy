
import React from 'react';

interface LoadingSpinnerProps {
    message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = "جاري التحميل..." }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="w-16 h-16 border-4 border-brand-pink border-t-transparent border-solid rounded-full animate-spin"></div>
      <p className="mt-4 text-lg text-brand-pink-dark font-semibold">{message}</p>
    </div>
  );
};

export default LoadingSpinner;
