import { Button, InputField, Card, NotificationCard } from "../../components";
import styles from "./Home.module.scss";
import { useState } from "react";

const Home = () => {
  const [name, setName] = useState<string>("");
  return (
    <div className={styles.container}>
      <section>
        <h1>Button</h1>
        <Button>Btn</Button>
        <InputField
          id="some-button"
          disabled
          type="text"
          label="Name"
          value={name}
          required
          onChange={(e) => setName(e.target.value)}
        />
      </section>
      <Card title="Recent Test Analysis">
        <h1>Children Cards</h1>
      </Card>
      <NotificationCard
        id="aasdadsd"
        status="success"
        title="New Student Joined"
        description="New student join IIT Pulse Anurag Pal - Dropper Batch"
        createdAt="10 Jan, 2022"
      />
    </div>
  );
};

export default Home;
