import styles from "./MainLayout.module.scss";
import { MenuDrawer } from "../components";
import notificationIcon from "../assets/icons/notification.svg";
import searchIcon from "../assets/icons/search.svg";
import { IconButton } from "@mui/material";
import React, { useState } from "react";
import CustomBreadCrumb from "../components/CustomBreadCrumb/CustomBreadCrumb";
import { useLocation } from "react-router";

interface Props {
  children: React.ReactNode;
  name: string;
  menuActions?: React.ReactNode;
  onClickDrawerIcon?: () => void;
  [key: string]: any;
}

const MainLayout: React.FC<Props> = ({
  name,
  children,
  onClickDrawerIcon,
  menuActions,
  ...rest
}) => {
  const location = useLocation();
  return (
    <div className={styles.container} {...rest}>
      <MenuDrawer />
      <section className={styles.mainContainer}>
        <nav>
          <CustomBreadCrumb
            location={location.pathname}
            name={name}
          />

          <div className={styles.actions}>
            {menuActions}
            {/* {onClickDrawerIcon && (
              <IconButton onClick={onClickDrawerIcon}>
                <img src={notificationIcon} alt="notification" />
              </IconButton>
            )} */}
          </div>
        </nav>
        <main className={styles.main}>{children}</main>
      </section>
    </div>
  );
};

export default MainLayout;
