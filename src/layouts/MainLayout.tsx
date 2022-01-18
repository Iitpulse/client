import styles from "./MainLayout.module.scss";
import notificationIcon from "../assets/icons/notification.svg";
import searchIcon from "../assets/icons/search.svg";

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
          <h2>{props.title}</h2>
          <div className={styles.actions}>
            <div>
              <img src={searchIcon} alt="search" />
            </div>
            <div>
              <img src={notificationIcon} alt="notification" />
            </div>
          </div>
        </nav>
        <main className={styles.main}>{props.children}</main>
      </section>
      <div className={styles.right}>right side nav</div>
    </div>
  );
};

export default MainLayout;
