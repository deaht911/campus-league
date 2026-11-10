export default function ConfirmModal({ isOpen, title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', onConfirm, onCancel, isDanger = false }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-2xl border border-[#24405f] bg-[#0f1824] p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <h3 className="font-display text-xl font-bold text-white">{title}</h3>
        <p className="mt-2 text-sm text-gray-300">{message}</p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="btn-outline px-4 py-2 text-sm"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              isDanger
                ? 'bg-red-600 text-white hover:bg-red-500'
                : 'btn-primary'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
