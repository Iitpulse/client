import styles from "./Card.module.scss";
import leftArrow from "../../assets/icons/collapse.svg";

interface CardProps {
  title: string;
  actionBtn?: React.ReactNode;
  children: React.ReactNode;
  styles?: React.CSSProperties;
}
const Card = (props: CardProps) => {
  const { title, actionBtn, children } = props;
  return (
    <div className={styles.cardWrapper}>
      <div className={styles.header}>
        <p className={styles.title}>{title}</p>
        <div className={styles.btn}>
          {/* {actionBtn} */} More
          <img src={leftArrow} alt="Left Arrow" className={styles.leftArrow} />
        </div>
      </div>
      <div className={styles.listItems}>
        <p className={styles.selected}>Sunday Test JEE IOY</p>
      </div>

      <div className={styles.cardContainer} style={props.styles}>
        {children}
      </div>
    </div>
  );
};

export default Card;
