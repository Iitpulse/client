import styles from "./NotificationCard.module.scss";

interface Props {
  id: string;
  status: "general" | "success" | "warning" | "error";
  title: string;
  description: string;
  onClick?: (id: string) => void;
  createdAt: string;
}

const NotificationCard = (props: Props) => {
  const { title, description, createdAt } = props;
  return (
    <div className={styles.notificationCard}>
      <p className={styles.title}>{title}</p>
      <p className={styles.description}>{description}</p>
      <p className={styles.createdAt}>{createdAt}</p>
    </div>
  );
};

export default NotificationCard;
