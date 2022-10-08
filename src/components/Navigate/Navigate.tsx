import styles from "./Navigate.module.scss";
import { useNavigate } from "react-router";

interface Props {
  path: string;
  children: React.ReactNode;
}

const Navigate = (props: Props) => {
  const { path, children } = props;
  const navigate = useNavigate();

  return (
    <div onClick={() => navigate(path)} className={styles.container}>
      {children}
    </div>
  );
};

export default Navigate;
