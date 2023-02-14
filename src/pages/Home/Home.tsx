import {
  Button,
  InputField,
  Card,
  NotificationCard,
  Sidebar,
  StyledMUISelect,
} from "../../components";
import styles from "./Home.module.scss";
import { useContext, useEffect, useState } from "react";
import { Box, Grid, Skeleton } from "@mui/material";
import yellowFlag from "../../assets/icons/yellowFlag.svg";
import blueUsers from "../../assets/icons/blueUsers.svg";
import redWarning from "../../assets/icons/redWarning.svg";
import greenCrown from "../../assets/icons/greenCrown.svg";
import Users from "../../assets/icons/users.svg";
import monitor from "../../assets/icons/monitor.svg";
import edit from "../../assets/icons/edit.svg";
import calendarImage from "../../assets/images/calendar.svg";
import CustomModal from "../../components/CustomModal/CustomModal";
import React from "react";
import { TestContext } from "../../utils/contexts/TestContext";
import clsx from "clsx";
import { AUTH_TOKEN } from "../../utils/constants";
import CalendarComponent from "../../components/CalendarComponent/CalendarComponent";
import { API_USERS } from "../../utils/api";
import { AuthContext } from "../../utils/auth/AuthContext";
import MainLayout from "../../layouts/MainLayout";
import { Dropdown, Menu } from "antd";
import type { MenuProps } from "antd";
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
    let token = localStorage.getItem(AUTH_TOKEN);
    const testLink = import.meta.env.VITE_TEST_PORTAL_URI;
    a.href = `${testLink}/auth/${token}/${id}`;
    a.target = "_blank";
    a.click();
  }

  return (
    <div className={styles.listItemContainer} onClick={handleClickTest}>
      <p className={styles.title}>
        <span className={styles.index}>{index}</span>. &nbsp; {title}
      </p>
      <div className={styles.details}>
        <span>{marks} | </span> <span> {durationHours} Hr</span>
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
  const [instituteDetailsData, setInstituteDetailsData] = useState({} as any);
  const handleClose = () => setOpen(false);

  const { state, recentTest } = useContext(TestContext);
  const [recentTestIdx, setrecentTestidx] = useState<any>(0);
  const [recentTestValue, setrecentTestValue] = useState<any>(
    recentTest?.at(0)?.name
  );
  const { currentUser } = useContext(AuthContext);
  // console.log("recentTests in home : ", recentTest);

  const { ongoingTests } = state;
  useEffect(() => {
    const fetchInstituteDetails = async () => {
      console.log({ currentUser });
      try {
        const res = await API_USERS().get(`/institute/get`, {
          params: {
            _id: currentUser?.instituteId,
          },
        });
        setInstituteDetailsData(res.data);
        console.log({ "institute details": res });
      } catch (err) {
        console.log(err);
      }
    };
    if (currentUser) {
      fetchInstituteDetails();
    }
  }, [currentUser]);

  useEffect(() => {
    setrecentTestValue(recentTest?.at(0)?.name);
  }, [recentTest]);

  return (
    <MainLayout name="Home">
      {currentUser?.userType === "student"?
      <div className={styles.container} style={{width:"100%"}}>
        <Grid container spacing={4}>
          <Grid item xl={6} lg={6} md={6} sm={12} xs={12}>
            <div>
              <Card
                title="Upcoming Tests"
                styles={{ display: "flex", flexWrap: "wrap"}}
                classes={[styles.upcomingTestCard]}
              >
                {ongoingTests?.map((test, i) => (
                  <ListItem
                    key={test.id}
                    id={test.id}
                    index={i + 1}
                    title={test.name}
                    marks={360}
                    durationHours={
                      test?.durationInMinutes ? test.durationInMinutes / 60 : 3
                    }
                    mode="online"
                  />
                ))}
                {!ongoingTests && (
                  <Box sx={{ width: "100%" }}>
                    <Skeleton height={28} />
                    <Skeleton height={28} />
                    <Skeleton height={28} />
                    <Skeleton height={28} />
                  </Box>
                )}
              </Card>
            </div>
          </Grid>
          <Grid item xl={6} lg={6} md={6} sm={12} xs={12}>
            <div>
              <Card
                title="Ongoing Tests"
                styles={{ display: "flex", flexWrap: "wrap" }}
                classes={[styles.upcomingTestCard]}
              >
                {ongoingTests?.map((test, i) => (
                  <ListItem
                    key={test.id}
                    id={test.id}
                    index={i + 1}
                    title={test.name}
                    marks={360}
                    durationHours={
                      test?.durationInMinutes ? test.durationInMinutes / 60 : 3
                    }
                    mode="online"
                  />
                ))}
                {!ongoingTests && (
                  <Box sx={{ width: "100%" }}>
                    <Skeleton height={28} />
                    <Skeleton height={28} />
                    <Skeleton height={28} />
                    <Skeleton height={28} />
                  </Box>
                )}
              </Card>
            </div>
          </Grid>
          <Grid item xl={12} lg={12} md={12} sm={12} xs={12}>
            <Card
              actionBtn={
                <StyledMUISelect
                  label={"Recent Tests"}
                  options={recentTest.map((test) => ({
                    name: test.name,
                    value: test.name,
                  }))}
                  value={recentTestValue}
                  onChange={(e) => {
                    setrecentTestValue(e);
                    let test = recentTest.find((test) => test.name === e);
                    let idx = -1;
                    if (test) idx = recentTest.indexOf(test);
                    if (idx !== -1) setrecentTestidx(idx);
                  }}
                />
              }
              title="Recent Test Analysis"
              classes={[styles.recentTestContainer]}
            >
              <h2>{recentTest[recentTestIdx]?.name}</h2>
              <div className={styles.data}>
                <SubCard
                  title="Highest Marks"
                  content={String(recentTest[recentTestIdx]?.highestMarks)}
                  icon={greenCrown}
                  variant="success"
                />
                <SubCard
                  title="Average Marks"
                  content={String(
                    parseInt(
                      recentTest[recentTestIdx]?.averageMarks?.toString()
                    ).toFixed(2)
                  )}
                  icon={yellowFlag}
                  variant="warning"
                />
                <SubCard
                  title="Lowest Marks"
                  content={String(recentTest[recentTestIdx]?.lowestMarks)}
                  icon={redWarning}
                  variant="error"
                />
                <SubCard
                  title="Total Appeared"
                  content={String(recentTest[recentTestIdx]?.totalAppeared)}
                  icon={blueUsers}
                  variant="primary"
                />
              </div>
            </Card>
          </Grid>
          {/* <Grid item xl={12} md={12} xs={12}>
            <Card title="Schedule" classes={[styles.calendarImageCard]}>
              <CalendarComponent />
            </Card>
          </Grid> */}
        </Grid>
      </div>
      :
      <div className={styles.container}>
        <Grid container spacing={4}>
          <Grid item xl={6} lg={6} md={6} sm={12} xs={12}>
            <Card
              actionBtn={
                <StyledMUISelect
                  label={"Recent Tests"}
                  options={recentTest.map((test) => ({
                    name: test.name,
                    value: test.name,
                  }))}
                  value={recentTestValue}
                  onChange={(e) => {
                    setrecentTestValue(e);
                    let test = recentTest.find((test) => test.name === e);
                    let idx = -1;
                    if (test) idx = recentTest.indexOf(test);
                    if (idx !== -1) setrecentTestidx(idx);
                  }}
                />
              }
              title="Recent Test Analysis"
              classes={[styles.recentTestContainer]}
            >
              <h2>{recentTest[recentTestIdx]?.name}</h2>
              <div className={styles.data}>
                <SubCard
                  title="Highest Marks"
                  content={String(recentTest[recentTestIdx]?.highestMarks)}
                  icon={greenCrown}
                  variant="success"
                />
                <SubCard
                  title="Average Marks"
                  content={String(
                    parseInt(
                      recentTest[recentTestIdx]?.averageMarks?.toString()
                    ).toFixed(2)
                  )}
                  icon={yellowFlag}
                  variant="warning"
                />
                <SubCard
                  title="Lowest Marks"
                  content={String(recentTest[recentTestIdx]?.lowestMarks)}
                  icon={redWarning}
                  variant="error"
                />
                <SubCard
                  title="Total Appeared"
                  content={String(recentTest[recentTestIdx]?.totalAppeared)}
                  icon={blueUsers}
                  variant="primary"
                />
              </div>
            </Card>
          </Grid>

          <Grid item xl={6} lg={6} md={6} sm={12} xs={12}>
            <div>
              <Card
                title="Ongoing Tests"
                styles={{ display: "flex", flexWrap: "wrap" }}
                classes={[styles.upcomingTestCard]}
              >
                {ongoingTests?.map((test, i) => (
                  <ListItem
                    key={test.id}
                    id={test.id}
                    index={i + 1}
                    title={test.name}
                    marks={360}
                    durationHours={
                      test?.durationInMinutes ? test.durationInMinutes / 60 : 3
                    }
                    mode="online"
                  />
                ))}
                {!ongoingTests && (
                  <Box sx={{ width: "100%" }}>
                    <Skeleton height={28} />
                    <Skeleton height={28} />
                    <Skeleton height={28} />
                    <Skeleton height={28} />
                  </Box>
                )}
              </Card>
              <Card
                title="Institute Details"
                classes={[styles.instituteDetailsCard]}
              >
                <div className={styles.instituteDetails}>
                  {!instituteDetailsData?.batches && (
                    <>
                      <Skeleton height={75} width={160} />
                      <Skeleton height={75} width={160} />
                      <Skeleton height={75} width={160} />
                    </>
                  )}
                  {instituteDetailsData?.batches?.map(
                    (batch: any, idx: number) => (
                      <InstituteDetails
                        key={idx}
                        icon={yellowFlag}
                        batch={batch.name}
                        value={batch.totalStudents}
                      />
                    )
                  )}
                </div>
              </Card>
            </div>
          </Grid>
          <Grid item xl={12} md={12} xs={12}> 
            <Card title="Schedule" classes={[styles.calendarImageCard]}>
              {/* <img src={calendarImage} alt="icon" className={styles.calendarImage} /> */}
              <CalendarComponent />
            </Card>
          </Grid>
        </Grid>
      </div>}
      {/* <Sidebar title="Recent Activity">
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
      </Sidebar> */}

      <CustomModal
        title="Hello From Deepak"
        open={open}
        handleClose={handleClose}
      >
        YE CHILDREN HAI
      </CustomModal>

    </MainLayout>
  );
};

export default Home;
