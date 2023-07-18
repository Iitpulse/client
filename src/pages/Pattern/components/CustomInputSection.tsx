import { HTMLInputTypeAttribute } from "react";
import styles from "../Pattern.module.scss";

interface IInputProps {
  type?: HTMLInputTypeAttribute;
  value: any;
  onChange: (e: any) => void;
  label?: string;
  placehodler?: string;
  inputProps?: any;
  id?: string;
  error?: string;
}

const CustomInputSection: React.FC<IInputProps> = ({
  type,
  id,
  label,
  placehodler,
  value,
  onChange,
  inputProps,
  error,
}) => {
  return (
    <div className={styles.customInput}>
      <label htmlFor={id}>{label}</label>
      <input
        style={{
          border: error?.length && error?.length > 0 ? "1px solid red" : "",
        }}
        title={label}
        onChange={onChange}
        type={type}
        value={value}
        id={id}
        placeholder={placehodler}
        {...inputProps}
      />
    </div>
  );
};

export default CustomInputSection;
