import styles from "./MainLayout.module.scss";
import { MenuDrawer } from "../components";
import notificationIcon from "../assets/icons/notification.svg";
import searchIcon from "../assets/icons/search.svg";
import { IconButton } from "@mui/material";

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
            <IconButton>
              <img src={searchIcon} alt="search" />
            </IconButton>
            &nbsp; &nbsp;
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
