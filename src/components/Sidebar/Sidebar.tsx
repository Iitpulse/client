import styles from "./Sidebar.module.scss";
import { Button } from "../";
import { IconButton } from "@mui/material";
import Close from "../../assets/icons/collapse.svg";
import { useEffect, useRef, useState } from "react";
import notificationIcon from "../../assets/icons/notification.svg";
interface SidebarProps {
  title: string;
  children: React.ReactNode;
  ActionBtn?: React.ReactNode;
}

const Sidebar = (props: SidebarProps) => {
  const [isCollapsed, setCollapsed] = useState(true);
  // useEffect(() => {
  //   localStorage.getItem("sidebarCollapsed") === "true"
  //     ? setCollapsed(true)
  //     : setCollapsed(false);
  // }, []);
  const wrapperRef = useRef<HTMLDivElement>(null);
  function handleCollapse(value: boolean) {
    let root = document.documentElement;
    // localStorage.setItem("sidebarCollapsed", value.toString());
    root.style.setProperty("--sidebar-width", !value ? "20px" : "300px");
    if (wrapperRef?.current)
      wrapperRef.current.style.display = !value ? "none" : "block";
    return () => setCollapsed(value);
  }
  return (
    <div className={styles.wrapper}>
      {isCollapsed ? (
        <IconButton
          onClick={handleCollapse(false)}
          className={styles.burgerMenuBtn}
        >
          {/* <div className={styles.burger}>
            <span className={styles.burgerItem}></span>
            <span className={styles.burgerItem}></span>
            <span className={styles.burgerItem}></span>
          </div> */}
          <img src={notificationIcon} alt="icon" />
        </IconButton>
      ) : (
        <div ref={wrapperRef} className={styles.container}>
          <div className={styles.header}>
            <p>{props.title}</p>
            <IconButton onClick={handleCollapse(true)}>
              <img
                style={{ transform: "rotate(180deg)" }}
                src={Close}
                alt="Close"
              />
            </IconButton>
          </div>
          {props.ActionBtn}
          <div className={styles.hLine}></div>
          <div className={styles.children}>{props.children}</div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
