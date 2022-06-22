import React from "react";
import styles from "./AddUserModal.module.scss";
import closeIcon from "../../../assets/icons/close-circle.svg";
import { LinearProgress } from "@mui/material";
import clsx from "clsx";

interface props {
  title: string;
  children: React.ReactNode;
  headerChildren?: React.ReactNode;
  loading?: boolean;
  error?: string;
  success?: string;
  handleCloseModal: () => void;
  actionBtns: React.ReactNode;
  classes: Array<string>;
}

const AddUserModal: React.FC<props> = ({
  title,
  children,
  loading,
  error,
  success,
  headerChildren,
  handleCloseModal,
  actionBtns,
  classes,
}) => {
  return (
    <div className={clsx(styles.container, classes)}>
      <div className={styles.content}>
        <div className={styles.header}>
          <div>
            <h2>{title}</h2>
            {headerChildren}
          </div>
          <img onClick={handleCloseModal} src={closeIcon} alt="Close" />
        </div>
        {children}
        <div className={styles.buttons}>{actionBtns}</div>
        <div className={styles.progressError}>
          {loading && <LinearProgress />}
          {error && <span className={styles.error}>{error}</span>}
          {success && <span className={styles.success}>{success}</span>}
        </div>
      </div>
    </div>
  );
};

export default AddUserModal;
