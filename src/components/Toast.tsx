import { useEffect, useState } from 'react';
import { CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface ToastProps {
  message: string;
  duration?: number;
  onClose: () => void;
}

export default function Toast({ message, duration = 3000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for fade out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  return (
    <div className={`
      fixed bottom-24 left-1/2 transform -translate-x-1/2 
      bg-gray-900 dark:bg-gray-700 text-white px-4 py-3 rounded-lg shadow-lg
      flex items-center gap-2 z-50
      animate-fade-in-up
    `}>
      <CheckCircleIcon className="h-5 w-5 text-[#dbf111]" />
      <span>{message}</span>
      <button 
        onClick={() => {
          setIsVisible(false);
          setTimeout(onClose, 300);
        }}
        className="ml-2 text-gray-400 hover:text-white"
      >
        <XMarkIcon className="h-5 w-5" />
      </button>
    </div>
  );
}