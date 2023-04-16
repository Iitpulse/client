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
}

const CustomInputSection: React.FC<IInputProps> = ({
  type,
  id,
  label,
  placehodler,
  value,
  onChange,
  inputProps,
}) => {
  return (
    <div className={styles.customInput}>
      <label htmlFor={id}>{label}</label>
      <input
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
