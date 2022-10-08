import styles from "./Card.module.scss";
import leftArrow from "../../assets/icons/collapse.svg";
import clsx from "clsx";

interface CardProps {
  title?: string;
  actionBtn?: React.ReactNode;
  children: React.ReactNode;
  styles?: React.CSSProperties;
  classes?: Array<string>;
}
const Card = (props: CardProps) => {
  const { title, actionBtn, children, classes } = props;
  return (
    <div className={clsx(styles.cardWrapper, classes)}>
      <div className={styles.header}>
        <p className={styles.title}>{title}</p>
        <div className={styles.btn}>
          {/* {actionBtn} */} More
          <img src={leftArrow} alt="Left Arrow" className={styles.leftArrow} />
        </div>
      </div>

      <div className={styles.cardContainer} style={props.styles}>
        {children}
      </div>
    </div>
  );
};

export default Card;
