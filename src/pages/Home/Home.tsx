import {
  Button,
  InputField,
  Card,
  NotificationCard,
  Sidebar,
  StyledMUISelect,
} from "../../components";
import { Select } from "antd";
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
import { API_USERS } from "../../utils/api/config";
import { AuthContext } from "../../utils/auth/AuthContext";
import MainLayout from "../../layouts/MainLayout";
import ScheduleCalendar from "./ScheduleCalendar/ScheduleCalendar";
import { ITest } from "../../utils/interfaces";
import { CodeSandboxCircleFilled } from "@ant-design/icons";
import dayjs from "dayjs";
import { Navigate } from "react-router";

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
  // console.log({icon,batch,value});
  // console.log("Hello");
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
  const [loadingInsitutionDetails, setLoadingInstitutionDetails] =
    useState(false);
  const [upcomingTests, setUpcomingTests] = useState<any>([]);
  const [ongoingTests, setOngoingTests] = useState<any>([]);
  const { state, recentTest, fetchTest } = useContext(TestContext);
  const [recentTestIdx, setrecentTestidx] = useState<any>(0);
  const [recentTestValue, setrecentTestValue] = useState<any>(
    recentTest?.at(0)?.name
  );
  const [loadingUpcoming, setLoadingUpcoming] = useState<boolean>(false);
  const [loadingOngoing, setLoadingOngoing] = useState<boolean>(false);
  const { currentUser, userDetails } = useContext(AuthContext);

  const { activeTests } = state;

  const handleClose = () => setOpen(false);

  function getStatus(validity: any) {
    const testDateRange = [dayjs(validity.from), dayjs(validity.to)];
    if (testDateRange[0] && testDateRange[1]) {
      if (dayjs().isBefore(testDateRange[0])) {
        return "Upcoming";
      }
      if (dayjs().isAfter(testDateRange[1])) {
        return "Expired";
      }
      return "Ongoing";
    }
    return "Active";
  }

  useEffect(() => {
    if (fetchTest) {
      setLoadingUpcoming(true);
      setLoadingOngoing(true);
      setOngoingTests([]);
      setUpcomingTests([]);
      currentUser?.userType === "student"
        ? fetchTest("active", false, (error, result) => {
            console.log({ error, result });
            setLoadingOngoing(false);
            setOngoingTests(
              result
                ?.map((test: any) => ({ ...test, key: test._id, id: test._id }))
                ?.filter((t) => {
                  return getStatus(t.validity) === "Ongoing";
                })
                ?.filter(
                  (test) =>
                    !test.result.students.find(
                      (student: any) => student._id === currentUser?.id
                    )
                )
            );
          })
        : fetchTest("active", false, (error, result) => {
            setLoadingOngoing(false);
            setOngoingTests(
              result
                ?.map((test: any) => ({ ...test, key: test._id, id: test._id }))
                ?.filter((t) => {
                  return getStatus(t.validity) === "Ongoing";
                })
            );
          });
      fetchTest("active", false, (error, result) => {
        let upcomingTests = result?.filter((t) => {
          return getStatus(t.validity) === "Upcoming";
        });
        setLoadingUpcoming(false);
        setUpcomingTests(
          upcomingTests?.map((test: any) => ({
            ...test,
            key: test._id,
            id: test._id,
            name: test.name,
            createdAt: test.createdAt,
            status: test.status,
            exam: test.exam,
          }))
        );
      });
    }
  }, [currentUser, userDetails]);

  useEffect(() => {
    // console.log({currentUser});
    const fetchInstituteDetails = async () => {
      setLoadingInstitutionDetails(true);
      try {
        const res = await API_USERS().get(`/institute/get`, {
          params: {
            _id: currentUser?.instituteId,
          },
        });
        // console.log(res);
        setInstituteDetailsData(res.data);
        setLoadingInstitutionDetails(false);
      } catch (err) {
        setLoadingInstitutionDetails(false);
        console.log("fetchInstituteDetails failed", err);
      }
    };
    if (currentUser) {
      fetchInstituteDetails();
    }
  }, [currentUser]);

  useEffect(() => {
    setrecentTestValue(recentTest?.at(0)?.name);
  }, [recentTest]);

  function getCalendarData() {
    let data: ITest[] = [];
    if (ongoingTests?.length) {
      data = [...data, ...ongoingTests];
    }
    if (activeTests?.length) {
      data = [...data, ...activeTests];
    }
    return data;
  }

  return (
    <MainLayout name="Home">
      {currentUser?.userType === "student" ? (
        <div className={styles.container} style={{ width: "100%" }}>
          <Grid container spacing={4}>
            <Grid item xl={6} lg={6} md={6} sm={12} xs={12}>
              <div>
                <Card
                  title="Upcoming Tests"
                  styles={{ display: "flex", flexWrap: "wrap" }}
                  classes={[styles.upcomingTestCard]}
                >
                  {upcomingTests?.map((test: any, i: number) => (
                    <ListItem
                      key={test.id}
                      id={test.id}
                      index={i + 1}
                      title={test.name}
                      marks={360}
                      durationHours={
                        test?.durationInMinutes
                          ? test.durationInMinutes / 60
                          : 3
                      }
                      mode="online"
                    />
                  ))}
                  {!loadingUpcoming && upcomingTests?.length === 0 && (
                    <div className={styles.noTest}>
                      <p>No Upcoming Tests available</p>
                    </div>
                  )}
                  {loadingUpcoming && (
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
                  {ongoingTests?.map((test: any, i: number) => (
                    <ListItem
                      key={test.id}
                      id={test.id}
                      index={i + 1}
                      title={test.name}
                      marks={360}
                      durationHours={
                        test?.durationInMinutes
                          ? test.durationInMinutes / 60
                          : 3
                      }
                      mode="online"
                    />
                  ))}
                  {!loadingOngoing && ongoingTests?.length === 0 && (
                    <div className={styles.noTest}>
                      <p>No Ongoing Tests available</p>
                    </div>
                  )}
                  {loadingOngoing && (
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
                  <Select
                    placeholder={"Recent Tests"}
                    options={recentTest.map((test) => ({
                      label: test.name,
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
                    content={String(recentTest[recentTestIdx]?.averageMarks)}
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
            <Grid item xl={12} md={12} xs={12}>
              <Card title="Schedule" classes={[styles.calendarImageCard]}>
                <ScheduleCalendar data={ongoingTests as ITest[]} />
              </Card>
            </Grid>
          </Grid>
        </div>
      ) : (
        <div className={styles.container}>
          <Grid container spacing={4}>
            <Grid item xl={6} lg={6} md={6} sm={12} xs={12}>
              <Card
                actionBtn={
                  <Select
                    placeholder={"Recent Tests"}
                    options={recentTest.map((test) => ({
                      label: test.name,
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
                      recentTest[recentTestIdx]?.averageMarks?.toString()
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
                  {!loadingOngoing && ongoingTests?.length === 0 && (
                    <div className={styles.noTest}>
                      <p>Looks like you've finished all your tests!</p>
                    </div>
                  )}
                  {loadingOngoing && (
                    <Box sx={{ width: "100%" }}>
                      <Skeleton height={28} />
                      <Skeleton height={28} />
                      <Skeleton height={28} />
                      <Skeleton height={28} />
                    </Box>
                  )}
                  {ongoingTests?.map((test: any, i: number) => (
                    <ListItem
                      key={test.id}
                      id={test.id}
                      index={i + 1}
                      title={test.name}
                      marks={360}
                      durationHours={
                        test?.durationInMinutes
                          ? test.durationInMinutes / 60
                          : 3
                      }
                      mode="online"
                    />
                  ))}
                </Card>
                {/* {console.log(instituteDetailsData)} */}
                <Card
                  title="Institute Details"
                  classes={[styles.instituteDetailsCard]}
                >
                  <div className={styles.instituteDetails}>
                    {loadingInsitutionDetails && (
                      <>
                        <Skeleton height={75} width={160} />
                        <Skeleton height={75} width={160} />
                        <Skeleton height={75} width={160} />
                      </>
                    )}
                    {!loadingInsitutionDetails &&
                      !instituteDetailsData?.members?.batches?.length && (
                        <div className={styles.noTest}>
                          <p>No data available</p>
                        </div>
                      )}
                    {instituteDetailsData?.members?.batches?.map(
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
                <ScheduleCalendar data={getCalendarData()} />
              </Card>
            </Grid>
          </Grid>
        </div>
      )}
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
