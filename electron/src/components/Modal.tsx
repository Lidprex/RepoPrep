import type { ReactNode } from "react";
import { Icon } from "./Icon";

interface ModalProps {
  icon: "ok" | "err";
  title: string;
  body: string;
  onConfirm?: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  showCancel?: boolean;
  elevated?: boolean;
  children?: ReactNode;
}

export function Modal({
  icon,
  title,
  body,
  onConfirm,
  onCancel,
  confirmLabel,
  cancelLabel,
  showCancel = true,
  elevated = false,
  children,
}: ModalProps) {
  return (
    <div className={`modal-backdrop${elevated ? " elevated" : ""}`} onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className={`modal-icon ${icon === "ok" ? "ok" : "err"}`}>
          <Icon name={icon === "ok" ? "check" : "info"} size={22} />
        </div>
        <h3>{title}</h3>
        <p>{body}</p>
        {children}
        <div className="modal-actions">
          {showCancel && (
            <button className="btn btn-ghost" onClick={onCancel}>
              {cancelLabel}
            </button>
          )}
          {onConfirm && (
            <button className="btn btn-primary" onClick={onConfirm}>
              {confirmLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}