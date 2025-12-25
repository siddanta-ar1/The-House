'use client'
import { AlertCircle, CheckCircle2, HelpCircle } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  message: string;
  type: 'success' | 'error' | 'confirm';
  onClose: () => void;
  onConfirm?: () => void; // Only used for 'confirm' type
}

export default function StatusModal({ isOpen, message, type, onClose, onConfirm }: ModalProps) {
  if (!isOpen) return null;

  const config = {
    success: { icon: <CheckCircle2 size={32} />, color: 'text-green-600', bg: 'bg-green-100', title: 'Success' },
    error: { icon: <AlertCircle size={32} />, color: 'text-red-600', bg: 'bg-red-100', title: 'Error' },
    confirm: { icon: <HelpCircle size={32} />, color: 'text-blue-600', bg: 'bg-blue-100', title: 'Are you sure?' }
  };

  const style = config[type];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl scale-in-center">
        
        {/* Icon */}
        <div className="flex justify-center mb-5">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${style.bg} ${style.color}`}>
            {style.icon}
          </div>
        </div>

        {/* Text */}
        <h3 className="text-xl font-bold text-center text-[#1A1A1A] mb-2 uppercase tracking-wide">
          {style.title}
        </h3>
        <p className="text-center text-[#8C8C8C] mb-8 text-sm leading-relaxed font-medium">
          {message}
        </p>

        {/* Buttons */}
        <div className="flex gap-3">
          {type === 'confirm' ? (
            <>
              <button onClick={onClose} className="flex-1 py-4 rounded-2xl bg-stone-100 text-stone-500 font-bold uppercase text-xs hover:bg-stone-200 transition-colors">
                Cancel
              </button>
              <button onClick={() => { onConfirm?.(); onClose(); }} className="flex-1 py-4 rounded-2xl bg-[#1A1A1A] text-white font-bold uppercase text-xs hover:scale-[0.98] transition-transform">
                Confirm
              </button>
            </>
          ) : (
            <button onClick={onClose} className="w-full py-4 rounded-2xl bg-[#1A1A1A] text-white font-bold uppercase text-xs hover:scale-[0.98] transition-transform">
              Okay
            </button>
          )}
        </div>
      </div>
    </div>
  );
}