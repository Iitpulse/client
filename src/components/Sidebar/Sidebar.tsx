import styles from "./Sidebar.module.scss";
import { IconButton } from "@mui/material";
import Close from "../../assets/icons/collapse.svg";
import { useRef } from "react";
import { Drawer } from "antd";

interface SidebarProps {
  title: string;
  children: React.ReactNode;
  ActionBtn?: React.ReactNode;
  open: boolean;
  handleClose: () => void;
  placement?: "left" | "right" | "top" | "bottom";
  width: number | string;
  extra?: React.ReactNode;
}

const Sidebar: React.FC<SidebarProps> = ({
  title,
  children,
  ActionBtn,
  open,
  handleClose,
  placement = "right",
  width,
  extra,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  // function handleCollapse(value: boolean) {
  //   let root = document.documentElement;
  //   // localStorage.setItem("sidebarCollapsed", value.toString());
  //   root.style.setProperty("--sidebar-width", !value ? "20px" : "300px");
  //   if (wrapperRef?.current)
  //     wrapperRef.current.style.display = !value ? "none" : "block";
  //   return () => setCollapsed(value);
  // }

  return (
    <Drawer
      open={open}
      onClose={handleClose}
      placement={placement}
      title={title}
      width={width}
      extra={extra}
    >
      <div ref={wrapperRef} className={styles.container}>
        {/* <div className={styles.header}>
          <p>{title}</p>
          <IconButton onClick={handleClose}>
            <img
              style={{ transform: "rotate(180deg)" }}
              src={Close}
              alt="Close"
            />
          </IconButton>
        </div> */}
        {ActionBtn}
        {/* <div className={styles.hLine}></div> */}
        <div className={styles.children}>{children}</div>
      </div>
    </Drawer>
  );
};

export default Sidebar;
