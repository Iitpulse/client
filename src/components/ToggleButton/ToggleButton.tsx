import styles from "./ToggleButton.module.scss";
import greenTick from "../../assets/icons/greenTick.svg";
import greyCross from "../../assets/icons/greyCross.svg";
import { useState } from "react";
import clsx from "clsx";

const ToggleSwitch = () => {
  const [Active, setActive] = useState(false);

  return (
    <div
      onClick={() => {
        setActive(!Active);
      }}
      className={clsx(styles.switchPath, Active ? styles.active : "")}
    >
      <div className={clsx(styles.circle)}>
        <img className={styles.tick} src={greenTick} alt="Tick" />
        <img className={styles.cross} src={greyCross} alt="Cross" />
      </div>
    </div>
  );
};

export default ToggleSwitch;
