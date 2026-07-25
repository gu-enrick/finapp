import { useEffect } from "react";
import { createPortal } from "react-dom";

export default function ConfirmModal({ open, message, onConfirm, onCancel }) {
  // Fecha o modal se o usuário apertar ESC
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm shadow-xl border border-gray-100 dark:border-gray-800">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-6 text-center">
          {message}
        </h3>
        
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>,
    document.body // Joga o modal direto pro <body>, escapando do Swipe!
  );
}