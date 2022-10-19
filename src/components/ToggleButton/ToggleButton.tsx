import styles from "./ToggleButton.module.scss";
import greenTick from "../../assets/icons/greenTick.svg";
import greyCross from "../../assets/icons/greyCross.svg";
import clsx from "clsx";

interface Props {
  checked: boolean;
  partial?: boolean;
  stopPropagation?: boolean;
  onChange: (checked: boolean) => void;
}

const ToggleSwitch: React.FC<Props> = ({
  checked,
  onChange,
  partial,
  stopPropagation,
}) => {
  return (
    <div
      onClick={(e: any) => {
        onChange(!checked);
        if (stopPropagation) e.stopPropagation();
      }}
      className={clsx(
        styles.switchPath,
        checked ? styles.active : "",
        partial ? styles.partialChecked : ""
      )}
    >
      <div className={clsx(styles.circle)}>
        <img className={styles.tick} src={greenTick} alt="Tick" />
        <img className={styles.cross} src={greyCross} alt="Cross" />
      </div>
    </div>
  );
};

export default ToggleSwitch;
