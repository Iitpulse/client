import styles from "./MainLayout.module.scss";

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
            <span>s</span>
            <span>n</span>
          </div>
        </nav>
        <main className={styles.main}>{props.children}</main>
      </section>
      <div className={styles.right}>right side nav</div>
    </div>
  );
};

export default MainLayout;
