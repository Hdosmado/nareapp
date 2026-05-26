import { Icon } from './Icon';
import { Portal } from './Portal';

/** Diálogo modal de confirmación para acciones destructivas. */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Eliminar',
  busy = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Portal>
      <div className="overlay" onClick={onCancel}>
        <div
          className="modal modal--narrow"
          onClick={(e) => e.stopPropagation()}
          role="alertdialog"
          aria-modal="true"
        >
        <div className="modal__head">
          <div>
            <div className="eyebrow">Confirmación requerida</div>
            <div className="modal__title">{title}</div>
          </div>
        </div>
        <div className="modal__body">
          <p className="modal__text">{message}</p>
        </div>
        <div className="modal__foot">
          <button className="btn" onClick={onCancel} disabled={busy}>
            Cancelar
          </button>
          <button
            className="btn btn--danger"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? (
              <Icon name="spinner" size={15} className="spin" />
            ) : (
              <Icon name="trash" size={15} />
            )}
            {confirmLabel}
          </button>
        </div>
        </div>
      </div>
    </Portal>
  );
}
