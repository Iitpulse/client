import styles from "./Results.module.scss";
import { useParams, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { Button, Sidebar, NotificationCard, Navigate } from "../../components/";

const tests = [
  {
    id: 1,
    name: "Sample Test",
    exam: { fullName: "JEE MAINS" },
    createdAt: "22/01/2032",
    status: "Ongoing",
  },
];
const tempResult = {
  testId: 1,
};

const Results = () => {
  const { testId } = useParams();
  const [currentTest, setCurrentTest] = useState<any>({});
  const navigate = useNavigate();

  function getTest() {
    const [test] = tests.filter((item) => item.id.toString() === testId);
    setCurrentTest(test);
  }
  function getStatusColor(status: string) {
    if (!status) return;
    switch (status.toLowerCase()) {
      case "ongoing": {
        return "var(--clr-success)";
      }

      default: {
        return "red";
      }
    }
  }
  function getResult() {
    return tempResult;
  }
  useEffect(() => {
    getTest();
  }, [testId]);
  return (
    <div className={styles.container}>
      <Navigate path={"/test"}>Back To Tests</Navigate>
      <div className={styles.content}>
        <div className={styles.top}>
          <h2>
            {currentTest?.name} ({currentTest?.exam?.fullName})
          </h2>
          <div className={styles.status}>
            {currentTest?.status}{" "}
            <div
              className={styles.statusColor}
              style={{ backgroundColor: getStatusColor(currentTest?.status) }}
            ></div>{" "}
          </div>
        </div>

        <div className={styles.basicInfo}>
          <h3 className={styles.marksObtained}>
            Marks Obtained :{" "}
            <span className={styles.boldLarge}>{23 * 3 * 4}/360</span>
          </h3>
          <h3 className={styles.totalAttempted}>
            Attempted : <span className={styles.boldLarge}>{23 * 3}</span>{" "}
          </h3>
        </div>
        <div className={styles.cards}>
          <SubjectCard />
          <SubjectCard />
          <SubjectCard />
        </div>
        <Button
          onClick={() => navigate("/test/result/detailed-analysis/" + testId)}
          color="success"
        >
          View Detailed Analysis
        </Button>
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
    </div>
  );
};

interface ISubjectCard {}

const SubjectCard = (props: ISubjectCard) => {
  return (
    <div className={styles.subjectCard}>
      <h3 className={styles.subjectName}>Physics</h3>
      <p>
        Marks Obtained : <span className={styles.boldSmall}>{23 * 4}</span>
      </p>
      <p>
        Attempted : <span className={styles.boldSmall}>23/30</span>
      </p>{" "}
      <div className={styles.moreInfo}>
        <p>
          Correct : <span className={styles.boldSmall}> 23</span>
        </p>
        <p>
          Incorrect : <span className={styles.boldSmall}>0</span>
        </p>
        <p>
          Accuracy : <span className={styles.boldSmall}>100%</span>
        </p>
        <p>
          Time Elapsed : <span className={styles.boldSmall}>1:00:00</span>
        </p>
      </div>
      <div className={styles.circularProgress}></div>
    </div>
  );
};

export default Results;
