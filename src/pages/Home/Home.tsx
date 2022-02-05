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
import icon from "../../assets/icons/flag.svg";
import Users from "../../assets/icons/users.svg";
import monitor from "../../assets/icons/monitor.svg";

interface SubCardProps {
  title: string;
  icon: string;
  content: string;
}

interface InstituteDetailsProps {
  icon: string;
  batch: string;
  number: Number;
}

const SubCard = (props: SubCardProps) => {
  const { title, content } = props;
  return (
    <div className={styles.wrapper}>
      <span className={styles.title}>{title}</span>
      <span className={styles.content}>{content}</span>
      <img src={icon} alt="Icon" className={styles.icon} />
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

const InstituteDetails = (props: InstituteDetailsProps) => {
  const { icon, batch, number } = props;
  return (
    <div className={styles.batch}>
      <div className={styles.batchContainer}>
        <img src={icon} alt="icon" />
        <span className={styles.batchName}>{batch}</span>
      </div>
      <span className={styles.number}>{number}</span>
    </div>
  );
};

const Home = () => {
  const [name, setName] = useState<string>("");
  return (
    <>
      <div className={styles.container}>
        <Grid container spacing={4}>
          <Grid item xl={6} lg={6} md={12} sm={12} xs={12}>
            <Card
              dropDown={true}
              title="Recent Test Analysis"
              styles={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "1rem",
              }}
            >
              <SubCard title="Highest Mark" content="302" icon={icon} />
              <SubCard title="Highest Mark" content="302" icon={icon} />
              <SubCard title="Highest Mark" content="302" icon={icon} />
              <SubCard title="Highest Mark" content="302" icon={icon} />
            </Card>
          </Grid>
          <Grid item xl={6} lg={6} md={12} sm={12} xs={12}>
            <div>
              <Card
                title="Upcoming Tests"
                styles={{ display: "flex", flexWrap: "wrap" }}
              >
                <ListItem />
                <ListItem />
                <ListItem />
              </Card>
              <Card title="Institute Details">
                <div className={styles.instituteDetails}>
                  <InstituteDetails icon={icon} batch="IOY" number={123} />
                  <InstituteDetails icon={icon} batch="IOY" number={123} />
                  <InstituteDetails icon={icon} batch="IOY" number={123} />
                </div>
              </Card>
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
