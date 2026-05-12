
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', className = '', ...props }) => {
  const baseClasses = 'font-bold py-2 px-6 rounded-lg transition-transform transform hover:scale-105 shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantClasses = {
    primary: 'bg-brand-pink text-white hover:bg-brand-pink-dark focus:ring-brand-pink',
    secondary: 'bg-brand-white text-brand-pink border border-brand-pink hover:bg-brand-pink-light focus:ring-brand-pink',
  };

  return (
    <button className={`${baseClasses} ${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export default Button;
