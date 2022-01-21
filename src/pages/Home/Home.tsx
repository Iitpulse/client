import {
  Button,
  InputField,
  Card,
  NotificationCard,
  Sidebar,
} from "../../components";
import styles from "./Home.module.scss";
import { useState } from "react";
import { Grid } from "@mui/material";

const Home = () => {
  const [name, setName] = useState<string>("");
  return (
    <>
      <div className={styles.container}>
        <Grid container spacing={4}>
          <Grid item xl={6} lg={12} md={12} sm={12} xs={12}>
            <Card title="Recent Test Analysis">Analysis</Card>
          </Grid>
          <Grid item xl={6} lg={12} md={12} sm={12} xs={12}>
            <div>
              <Card title="Upcoming Tests">something</Card>
              <Card title="Institute Details">something2</Card>
            </div>
          </Grid>
          <Grid item xl={12} md={12} xs={12}>
            <Card title="Schedule">schedule</Card>
          </Grid>
        </Grid>
      </div>
      <Sidebar title="Recent Activity">
        {Array(10)
          .fill(0)
          .map((_, i) => (
            <NotificationCard
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
