import { ReactNode, useEffect, useCallback } from 'react';

interface ModalProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  width?: 'sm' | 'md' | 'lg';
}

export function Modal({ title, children, onClose, width = 'md' }: ModalProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const widthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#0a0e14]/90 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`relative bg-[#0d1117] border border-[#30363d] rounded-lg shadow-2xl ${widthClasses[width]} w-full`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#21262d]">
          <h2 className="text-sm font-semibold text-[#e6edf3] font-mono uppercase tracking-wider">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 text-[#484f58] hover:text-[#e6edf3] hover:bg-[#21262d] rounded transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
}
