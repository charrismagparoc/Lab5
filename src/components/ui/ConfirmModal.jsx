export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, loading }) {
  if (isOpen === false) return null
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
        <div className="modal-hdr">
          <h3 className="text-danger">
            <i className="fa-solid fa-triangle-exclamation"></i> {title}
          </h3>
          <button className="modal-close" onClick={onCancel} type="button">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        <p className="confirm-msg">{message}</p>
        <div className="modal-foot">
          <button className="btn btn-secondary" onClick={onCancel} disabled={loading} type="button">Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={loading} type="button">
            {loading
              ? <><i className="fa-solid fa-spinner fa-spin"></i> Deleting...</>
              : <><i className="fa-solid fa-trash"></i> Delete</>}
          </button>
        </div>
      </div>
    </div>
  )
}
