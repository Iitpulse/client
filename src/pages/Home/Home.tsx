import {
  Button,
  InputField,
  Card,
  NotificationCard,
  Sidebar,
} from "../../components";
import styles from "./Home.module.scss";
import { useState } from "react";

const Home = () => {
  const [name, setName] = useState<string>("");
  return (
    <>
      <div className={styles.container}>
        <section>
          <h1>Button</h1>
          <Button title="Test BTN" color="primary">
            Btn Primary
          </Button>
          {/* <InputField
          id="some-button"
          disabled
          type="text"
          label="Name"
          value={name}
          required
          onChange={(e) => setName(e.target.value)}
        /> */}
        </section>
        <Card title="Recent Test Analysis">
          <h1>Children Cards</h1>
        </Card>
      </div>
      <Sidebar title="Recent Activity">
        {Array(10)
          .fill(0)
          .map((_, i) => (
            <NotificationCard
              key={i}
              id="aasdadsd"
              status={i % 2 === 0 ? "success" : "warning"}
              title={"New Student Joined-" + i}
              description="New student join IIT Pulse Anurag Pal - Dropper Batch"
              createdAt="10 Jan, 2022"
            />
          ))}
      </Sidebar>
    </>
  );
};

export default Home;
