import styles from "./Card.module.scss";

interface CardProps {
  title: string;
  actionBtn?: React.ReactNode;
  children: React.ReactNode;
}
const Card = (props: CardProps) => {
  const { title, actionBtn, children } = props;
  return (
    <div className={styles.cardWrapper}>
      <div className={styles.header}>
        <p className={styles.title}>{title}</p>
        <div className={styles.btn}> {/* {actionBtn} */} More</div>
      </div>
      <div className={styles.listItems}>
        <p className={styles.selected}>Sunday Test JEE IOY</p>
      </div>

      <div className={styles.cardContainer}>{children}</div>
    </div>
  );
};

export default Card;
