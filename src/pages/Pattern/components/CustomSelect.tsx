import styles from "../Pattern.module.scss";

interface ICustomSelectProps {
  id: string;
  label: string;
  value: string;
  onChange: (e: any) => void;
  options: Array<{
    value: string;
    label: string;
  }>;
  inputProps?: any;
}

const CustomSelect: React.FC<ICustomSelectProps> = ({
  id,
  label,
  value,
  onChange,
  options,
  inputProps,
}) => {
  return (
    <div className={styles.customInput}>
      <label htmlFor={id}>{label}</label>
      <select value={value} title={label} onChange={onChange}>
        {options.map((option) => (
          <option key={option.label} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default CustomSelect;
