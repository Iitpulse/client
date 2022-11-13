import { Button } from "antd";
import { HTMLInputTypeAttribute } from "react";
import styles from "./InputField.module.scss";

interface Props {
  id: string;
  label: string;
  type: HTMLInputTypeAttribute;
  placeholder?: string;
  disabled?: boolean;
  value: string;
  ref?: any;
  required?: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  [x: string]: any;
}

const InputField = (props: Props) => {
  const {
    id,
    type,
    label,
    placeholder,
    ref,
    required,
    disabled,
    value,
    onChange,
    ...rest
  } = props;
  return (
    <div
      style={
        type === "radio" || type === "checkbox"
          ? { flexDirection: "row", width: "fit-content", alignItems: "center" }
          : { flexDirection: "column-reverse" }
      }
      className={styles.container}
    >
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        value={value}
        onChange={onChange}
        {...rest}
      />
      <label htmlFor={id}>
        {label}
        {required && " *"}
      </label>
    </div>
  );
};

export default InputField;
