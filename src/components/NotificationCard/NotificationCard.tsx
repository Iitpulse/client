import styles from "./NotificationCard.module.scss";

interface NotificationCard {
  id: string;
  status: "general" | "success" | "warning" | "error";
  title: string;
  description: string;
  onClick?: (id: string) => void;
  createdAt: string;
}

const NotificationCard = (props: NotificationCard) => {
  const { id, status, title, description, createdAt } = props;
  return (
    <div className={styles.notificationCard}>
      <button></button>
      <p className={styles.title}>{title}</p>
      <p className={styles.description}>{description}</p>
      <p className={styles.createdAt}>{createdAt}</p>
    </div>
  );
};

export default NotificationCard;
