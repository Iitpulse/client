import styles from "./MainLayout.module.scss";
import { MenuDrawer } from "../components";
import notificationIcon from "../assets/icons/notification.svg";
import searchIcon from "../assets/icons/search.svg";
import { IconButton } from "@mui/material";
import React, { useState } from "react";
import TextField from "@mui/material/TextField";
import Stack from "@mui/material/Stack";
import Autocomplete from "@mui/material/Autocomplete";
import { top100Films } from "../utils/constants";

interface Props {
  children: React.ReactNode;
  title: string;
  [key: string]: any;
}

const MainLayout = (props: Props) => {
  return (
    <div className={styles.container} {...props}>
      <MenuDrawer />
      <section className={styles.mainContainer}>
        <nav>
          <h3>{props.title}</h3>
          <div className={styles.actions}>
            <Stack spacing={2}>
              <Autocomplete
                freeSolo
                id="free-solo-2-demo"
                disableClearable
                options={top100Films.map((option) => option.title)}
                renderInput={(params) => (
                  <TextField
                    className={styles.inputField}
                    {...params}
                    // label="Search Here"
                    variant="filled"
                    InputProps={{
                      ...params.InputProps,
                      type: "search",
                    }}
                  />
                )}
              />
              <div className={styles.imageContainer}>
                <img src={searchIcon} alt="Search Icon" />
              </div>
            </Stack>
            {/* &nbsp; &nbsp; */}
            <IconButton>
              <img src={notificationIcon} alt="notification" />
            </IconButton>
          </div>
        </nav>
        <main className={styles.main}>{props.children}</main>
      </section>
    </div>
  );
};

export default MainLayout;
