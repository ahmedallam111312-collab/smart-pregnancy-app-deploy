
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
}

const Input: React.FC<InputProps> = ({ label, id, className, ...props }) => {
  return (
    <div className="w-full">
      <label htmlFor={id} className="block text-right text-md font-medium text-brand-gray-dark mb-2">
        {label}
      </label>
      <input
        id={id}
        className={`w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-pink focus:border-transparent text-right ${className}`}
        {...props}
      />
    </div>
  );
};

export default Input;
