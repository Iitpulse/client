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
import icon from "../../assets/icons/crown.svg";
import monitor from "../../assets/icons/monitor.svg";
import React from "react";

interface subCardProps {
  title: String;
  // icon: Document;
  content: String;
}

const SubCard = (props: subCardProps) => {
  const { title, content } = props;
  return (
    <div className={styles.wrapper}>
      <span className={styles.title}>{title}</span>
      <span className={styles.content}>{content}</span>
      <img src={icon} alt="Crown Icon" className={styles.icon} />
    </div>
  );
};

const ListItem = () => {
  return (
    <div className={styles.listItemContainer}>
      <span className={styles.index}>1.</span>
      <p className={styles.title}>Sunday Test</p>
      <div className={styles.details}>
        <span>360 | </span> <span> 3 Hr |</span>
        <img src={monitor} alt="icon" className={styles.indicator} />
      </div>
    </div>
  );
};

const Home = () => {
  const [name, setName] = useState<string>("");
  return (
    <>
      <div className={styles.container}>
        <Grid container spacing={4}>
          <Grid item xl={6} lg={12} md={12} sm={12} xs={12}>
            <Card
              title="Recent Test Analysis"
              styles={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "2rem",
                width: "100%",
              }}
            >
              <SubCard title="Highest Mark" content="302" />
              <SubCard title="Highest Mark" content="302" />
              <SubCard title="Highest Mark" content="302" />
              <SubCard title="Highest Mark" content="302" />
            </Card>
          </Grid>
          <Grid item xl={6} lg={12} md={12} sm={12} xs={12}>
            <div>
              <Card
                title="Upcoming Tests"
                styles={{ display: "flex", flexWrap: "wrap" }}
              >
                <ListItem />
                <ListItem />
                <ListItem />
              </Card>
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
