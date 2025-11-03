
import React from 'react';
import { Page } from '../types';
import HomeIcon from './icons/HomeIcon';

interface BackButtonProps {
  navigate: (page: Page) => void;
}

const BackButton: React.FC<BackButtonProps> = ({ navigate }) => {
  return (
    <button
      onClick={() => navigate(Page.Home)}
      className="flex items-center gap-2 text-brand-pink hover:text-brand-pink-dark font-semibold transition-colors mb-6"
    >
      <HomeIcon className="w-6 h-6" />
      <span>العودة إلى الصفحة الرئيسية</span>
    </button>
  );
};

export default BackButton;
