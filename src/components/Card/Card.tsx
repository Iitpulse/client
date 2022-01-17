import styles from "./Card.module.scss";
import Button from "../Button/Button";
interface CardProps {
  title: string;
  actionBtn?: React.ReactNode;
  children: React.ReactNode;
}
const Card = (props: CardProps) => {
  return (
    <div>
      <h1>{props.title}</h1>
    </div>
  );
};

export default Card;
