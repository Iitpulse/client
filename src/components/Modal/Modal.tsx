import { useEffect, useRef } from "react";
import clsx from "clsx";
import styles from "./Modal.module.scss";
import closeIcon from "../../assets/icons/close-circle.svg";
import { IconButton } from "@mui/material";

interface ModalProps {
  isOpen: boolean;
  hideCloseIcon?: boolean;
  title: string;
  backdrop?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
  backdropClose?: boolean;
  onClose: () => void;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  title,
  backdrop,
  children,
  hideCloseIcon,
  footer,
  onClose,
  backdropClose = true,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      modalRef.current?.classList.add(styles.modalOpen);
    } else {
      modalRef.current?.classList.remove(styles.modalOpen);
    }
  }, [isOpen]);

  return (
    <div
      ref={modalRef}
      className={clsx(styles.container, backdrop ? styles.backdrop : "")}
      onClick={backdropClose ? onClose : undefined}
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>{title}</h3>
          {!hideCloseIcon && (
            <IconButton onClick={onClose}>
              <img src={closeIcon} alt="close-modal" />
            </IconButton>
          )}
        </div>
        <div className={styles.content}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  );
};

export default Modal;
