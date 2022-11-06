import { ButtonHTMLAttributes, MouseEvent } from "react";
import clsx from "clsx";
import styles from "./Button.module.scss";

interface ButtonProps {
  children: React.ReactNode | string;
  title?: string;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  classes?: Array<string>;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  type?: ButtonHTMLAttributes<HTMLButtonElement>["type"];
  disabled?: boolean;
  variant?: "primary" | "outlined" | "text";
  color?: "primary" | "success" | "error" | "warning";
  [key: string]: any;
}

const Button = (props: ButtonProps) => {
  const {
    title,
    classes,
    icon: Icon,
    iconPosition = "left",
    type,
    children,
    variant = "primary",
    onClick,
    disabled = false,
    color,
    ...rest
  } = props;

  return (
    <button
      title={title}
      type={type}
      className={clsx(
        styles.btn,
        classes ? [...classes] : "",
        getStyleByColor(color || "primary"),
        variant === "outlined"
          ? styles.outlined
          : variant === "text"
          ? styles.text
          : ""
      )}
      disabled={disabled}
      onClick={onClick || (() => {})}
      {...rest}
    >
      <span>
        {Icon && iconPosition === "left" && (
          <span className={styles.leftIcon}>{Icon}</span>
        )}
        <span className={styles.main}>{children}</span>
        {Icon && iconPosition === "right" && (
          <span className={styles.rightIcon}>{Icon}</span>
        )}
      </span>
    </button>
  );
};

export default Button;

function getStyleByColor(color: string) {
  switch (color) {
    case "primary":
      return styles.clrPrimary;
    case "success":
      return styles.clrSuccess;
    case "error":
      return styles.clrError;
    case "warning":
      return styles.clrWarning;
    default:
      return "";
  }
}
