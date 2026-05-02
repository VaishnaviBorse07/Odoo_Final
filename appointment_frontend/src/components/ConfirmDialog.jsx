// Accessible confirm modal — backdrop, title, message, cancel and confirm actions.
export default function ConfirmDialog({ isOpen, title, message, onConfirm, onCancel, confirmLabel = 'Confirm' }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-card bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-zen-ink">{title}</h3>
        <p className="mt-2 text-sm text-zen-muted">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-control border border-slate-200 px-4 py-2 text-sm font-semibold text-zen-ink hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-control bg-zen-error px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
