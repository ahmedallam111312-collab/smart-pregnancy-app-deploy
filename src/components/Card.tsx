
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '', title }) => {
  return (
    <div className={`bg-brand-white p-6 rounded-xl shadow-lg ${className}`}>
      {title && <h2 className="text-2xl font-bold text-brand-pink-dark mb-4 border-b-2 border-brand-pink-light pb-2">{title}</h2>}
      {children}
    </div>
  );
};

export default Card;
