import React from 'react';
import Button from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, onConfirm, title, children, confirmText="تأكيد", cancelText="إلغاء" }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="bg-white rounded-lg shadow-xl p-6 m-4 max-w-sm w-full text-right"
        onClick={e => e.stopPropagation()} // Prevent closing when clicking inside the modal
      >
        <h3 className="text-xl font-bold text-brand-pink-dark mb-4">{title}</h3>
        <div className="text-brand-gray-dark mb-6">
          {children}
        </div>
        <div className="flex justify-start gap-4 flex-row-reverse">
          <Button onClick={onConfirm}>
            {confirmText}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            {cancelText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
