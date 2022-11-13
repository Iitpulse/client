import styles from "./Card.module.scss";
import leftArrow from "../../assets/icons/collapse.svg";
import clsx from "clsx";

interface CardProps {
  title?: string;
  showMoreBtn?: boolean;
  actionBtn?: React.ReactNode;
  children: React.ReactNode;
  styles?: React.CSSProperties;
  disablePadding?: boolean;
  classes?: Array<string>;
}
const Card = (props: CardProps) => {
  const { title, actionBtn, children, classes, showMoreBtn, disablePadding } =
    props;
  return (
    <div
      className={clsx(
        styles.cardWrapper,
        disablePadding ? styles.noPadding : "",
        classes
      )}
    >
      {(title || showMoreBtn) && (
        <div className={styles.header}>
          <p className={styles.title}>{title}</p>
          {actionBtn}
          {showMoreBtn && (
            <div className={styles.btn}>
              {/* {actionBtn} */} More
              <img
                src={leftArrow}
                alt="Left Arrow"
                className={styles.leftArrow}
              />
            </div>
          )}
        </div>
      )}

      <div className={styles.cardContainer} style={props.styles}>
        {children}
      </div>
    </div>
  );
};

export default Card;
