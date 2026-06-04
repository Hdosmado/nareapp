import { Icon } from './Icon';
import { Modal } from './Modal';

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
    <Modal
      onClose={onCancel}
      className="modal--narrow"
      role="alertdialog"
      label={title}
    >
        <div className="modal__head">
          <div>
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
    </Modal>
  );
}
