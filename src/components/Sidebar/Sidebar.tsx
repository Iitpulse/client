import styles from "./Sidebar.module.scss";

interface SidebarProps {
  title: string;
  children: React.ReactNode;
  ActionBtn?: React.ReactNode;
}

const Sidebar = (props: SidebarProps) => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <p>{props.title}</p>
        {props.ActionBtn}
      </div>
      <div>{props.children}</div>
    </div>
  );
};

export default Sidebar;
