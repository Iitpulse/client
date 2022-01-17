import styles from "./Button.module.scss";

interface ButtonProps {
  children: React.ReactNode | string;
  title?: string;
  onClick?: () => void;
  classes?: string[];
  icon?: string;
  type?: "button" | "submit" | "reset";
}

const Button = (props: ButtonProps) => {
  return (
    <button title={props.title} className={styles.btn}>
      btn
    </button>
  );
};

export default Button;
