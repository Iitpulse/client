import styles from "./MainLayout.module.scss";
import notificationIcon from "../assets/icons/notification.svg";
import searchIcon from "../assets/icons/search.svg";
import { IconButton } from "@mui/material";
import { Sidebar } from "../components";

interface Props {
  children: React.ReactNode;
  title: string;
  [key: string]: any;
}

const MainLayout = (props: Props) => {
  return (
    <div className={styles.container} {...props}>
      <div>side nav</div>
      <section className={styles.mainContainer}>
        <nav>
          <h3>{props.title}</h3>
          <div className={styles.actions}>
            <IconButton>
              <img src={searchIcon} alt="search" />
            </IconButton>
            <IconButton>
              <img src={notificationIcon} alt="notification" />
            </IconButton>
          </div>
        </nav>
        <main className={styles.main}>{props.children}</main>
      </section>
      <Sidebar title="Recent Activity">
        {Array(10)
          .fill(0)
          .map((_, i) => (
            <p>Content</p>
          ))}
      </Sidebar>
    </div>
  );
};

export default MainLayout;
