import styles from "./NotificationCard.module.scss";
import closeIcon from "../../assets/icons/close-circle.svg";

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
      <button className={styles.closeIconBtn}>
        <img src={closeIcon} alt="close icon" className={styles.closeIconImg} />
      </button>
      <p className={styles.title}>{title}</p>
      <p className={styles.description}>{description}</p>
      <p className={styles.createdAt}>{createdAt}</p>
    </div>
  );
};

export default NotificationCard;
