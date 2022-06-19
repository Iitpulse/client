import {
  Button,
  InputField,
  Card,
  NotificationCard,
  Sidebar,
} from "../../components";
import styles from "./Home.module.scss";
import { useContext, useEffect, useState } from "react";
import { Grid } from "@mui/material";
import yellowFlag from "../../assets/icons/yellowFlag.svg";
import blueUsers from "../../assets/icons/blueUsers.svg";
import redWarning from "../../assets/icons/redWarning.svg";
import greenCrown from "../../assets/icons/greenCrown.svg";
import Users from "../../assets/icons/users.svg";
import monitor from "../../assets/icons/monitor.svg";
import edit from "../../assets/icons/edit.svg";
import CustomModal from "../../components/CustomModal/CustomModal";
import React from "react";
import { TestContext } from "../../utils/contexts/TestContext";
import clsx from "clsx";

interface SubCardProps {
  title: string;
  icon: string;
  content: string;
  variant: "success" | "warning" | "error" | "primary";
}

interface InstituteDetailsProps {
  icon: string;
  batch: string;
  value: Number;
}

interface UpcomingTestItemProps {
  index: number;
  id: string;
  title: string;
  marks: number;
  durationHours: number;
  mode: "online" | "offline";
}

function getVariantColor(variant: "success" | "warning" | "error" | "primary") {
  switch (variant) {
    case "success":
      return "#dafde8";
    case "warning":
      return "#fff3d3";
    case "error":
      return "#ffd8d8";
    case "primary":
      return "var(--clr-primary)";
    default:
      return "var(--clr-primary)";
  }
}

function getVariantClass(variant: "success" | "warning" | "error" | "primary") {
  switch (variant) {
    case "success":
      return styles.successCard;
    case "warning":
      return styles.warningCard;
    case "error":
      return styles.errorCard;
    case "primary":
      return styles.primaryCard;
    default:
      return styles.primaryCard;
  }
}

const SubCard = (props: SubCardProps) => {
  const { title, content, variant, icon } = props;
  return (
    <div className={clsx(styles.wrapper, getVariantClass(variant))}>
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
  id,
  title,
  durationHours,
  marks,
  mode,
}) => {
  function handleClickTest() {
    let a = document.createElement("a");
    let token = localStorage.getItem("token");
    a.href = `http://localhost:3001/auth/${token}/${id}`;
    a.target = "_blank";
    a.click();
  }

  return (
    <div className={styles.listItemContainer} onClick={handleClickTest}>
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
  const [open, setOpen] = React.useState(false);
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

  const { state } = useContext(TestContext);
  const { tests } = state;

  useEffect(() => {
    console.log({ tests });
  }, [tests]);

  return (
    <>
      <div className={styles.container}>
        <Grid container spacing={4}>
          <Grid item xl={6} lg={6} md={6} sm={12} xs={12}>
            <Card
              title="Recent Test Analysis"
              classes={[styles.recentTestContainer]}
            >
              <h2>Sunday Test IOY</h2>
              <div className={styles.data}>
                <SubCard
                  title="Highest Marks"
                  content="302"
                  icon={greenCrown}
                  variant="success"
                />
                <SubCard
                  title="Average Marks"
                  content="302"
                  icon={yellowFlag}
                  variant="warning"
                />
                <SubCard
                  title="Lowest Marks"
                  content="302"
                  icon={redWarning}
                  variant="error"
                />
                <SubCard
                  title="Total Appeared"
                  content="302"
                  icon={blueUsers}
                  variant="primary"
                />
              </div>
            </Card>
          </Grid>
          <Grid item xl={6} lg={6} md={6} sm={12} xs={12}>
            <div>
              <Card
                title="Upcoming Tests"
                styles={{ display: "flex", flexWrap: "wrap" }}
              >
                {tests?.map((test, i) => (
                  <ListItem
                    key={test.id}
                    id={test.id}
                    index={i + 1}
                    title={test.name}
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
                  <InstituteDetails icon={yellowFlag} batch="IOY" value={123} />
                  <InstituteDetails icon={yellowFlag} batch="IOY" value={123} />
                  <InstituteDetails icon={yellowFlag} batch="IOY" value={123} />
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
      >
        YE CHILDREN HAI
      </CustomModal>
    </>
  );
};

export default Home;
