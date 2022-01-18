import { Button, InputField, Card } from "../../components";
import styles from "./Home.module.scss";
import { useState } from "react";

const Home = () => {
  const [name, setName] = useState<string>("");
  return (
    <div className={styles.container}>
      <Button color="error">Kuldeep</Button>
    </div>
  );
};

export default Home;
