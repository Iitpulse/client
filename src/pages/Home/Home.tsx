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
import edit from "../../assets/icons/edit.svg";
import CustomModal from "../../components/CustomModal/CustomModal";
import React from "react";

interface SubCardProps {
  title: string;
  icon: string;
  content: string;
}

interface InstituteDetailsProps {
  icon: string;
  batch: string;
  value: Number;
}

interface UpcomingTestItemProps {
  index: number;
  title: string;
  marks: number;
  durationHours: number;
  mode: "online" | "offline";
}

const SubCard = (props: SubCardProps) => {
  const { title, content } = props;
  return (
    <div className={styles.wrapper}>
      <div className={styles.content}>
        <p>{title}</p>
        <h4>{content}</h4>
      </div>
      <img src={icon} alt="Icon" className={styles.icon} />
    </div>
  );
};

const ListItem: React.FC<UpcomingTestItemProps> = ({
  index,
  title,
  durationHours,
  marks,
  mode,
}) => {
  return (
    <div className={styles.listItemContainer}>
      <span className={styles.index}>{index}</span>
      <p className={styles.title}>{title}</p>
      <div className={styles.details}>
        <span>{marks} | </span> <span> {durationHours} Hr |</span>
        {mode === "online" ? (
          <img src={monitor} alt="icon" className={styles.indicator} />
        ) : (
          <img src={edit} alt="icon" className={styles.indicator} />
        )}
      </div>
    </div>
  );
};

const InstituteDetails = (props: InstituteDetailsProps) => {
  const { icon, batch, value } = props;
  return (
    <div className={styles.batch}>
      <div className={styles.batchContainer}>
        <img src={icon} alt="icon" />
        <span className={styles.batchName}>{batch}</span>
      </div>
      <span className={styles.number}>{value}</span>
    </div>
  );
};

const Home = () => {
  const [name, setName] = useState<string>("");

  const [open, setOpen] = React.useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const upcomgingTests = [
    {
      title: "Sunday Test JEE Advanced",
      marks: 360,
      durationHours: 3,
      mode: "online",
    },
    {
      title: "Sunday Test JEE Mains",
      marks: 360,
      durationHours: 3,
      mode: "offline",
    },
    {
      title: "Sunday Test NEET Dropper",
      marks: 720,
      durationHours: 3,
      mode: "online",
    },
  ];

  return (
    <>
      <div className={styles.container}>
        <Grid container spacing={4}>
          <Grid item xl={6} lg={6} md={12} sm={12} xs={12}>
            <Card
              title="Recent Test Analysis"
              classes={[styles.recentTestContainer]}
            >
              <h2>Sunday Test IOY</h2>
              <div className={styles.data}>
                <SubCard title="Highest Mark" content="302" icon={icon} />
                <SubCard title="Highest Mark" content="302" icon={icon} />
                <SubCard title="Highest Mark" content="302" icon={icon} />
                <SubCard title="Highest Mark" content="302" icon={icon} />
              </div>
            </Card>
          </Grid>
          <Grid item xl={6} lg={6} md={12} sm={12} xs={12}>
            <div>
              <Card
                title="Upcoming Tests"
                styles={{ display: "flex", flexWrap: "wrap" }}
              >
                {upcomgingTests.map((item, i) => (
                  <ListItem
                    index={i + 1}
                    title="Sunday Test JEE Adv."
                    marks={360}
                    durationHours={3}
                    mode="online"
                  />
                ))}
              </Card>
              <Card
                title="Institute Details"
                classes={[styles.instituteDetailsCard]}
              >
                <div className={styles.instituteDetails}>
                  <InstituteDetails icon={icon} batch="IOY" value={123} />
                  <InstituteDetails icon={icon} batch="IOY" value={123} />
                  <InstituteDetails icon={icon} batch="IOY" value={123} />
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

      <CustomModal
        title="Hello From Deepak"
        open={open}
        handleClose={handleClose}
        handleOpen={handleOpen}
      >
        YE CHILDREN HAI
      </CustomModal>
    </>
  );
};

export default Home;
