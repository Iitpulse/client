import styles from "./Results.module.scss";
import { useParams, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import Students from "../Users/Students/Students";

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

  useEffect(() => {
    console.log(currentTest);
  });
  function getTest() {
    const [test] = tests.filter((item) => item.id.toString() === testId);
    return test;
  }
  function getStatusColor(status: string) {
    if (!status) return;
    switch (status.toLowerCase()) {
      case "ongoing": {
        return "green";
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
    setCurrentTest(getTest());
  }, [testId]);
  return (
    <div className={styles.container}>
      <div className={styles.back} onClick={() => navigate("/test")}>
        Back To Tests
      </div>
      <div className={styles.content}>
        <div className={styles.top}>
          <h1>{currentTest?.name}</h1>
          <div className={styles.status}>
            {currentTest?.status}{" "}
            <div
              className={styles.statusColor}
              style={{ backgroundColor: getStatusColor(currentTest?.status) }}
            ></div>{" "}
          </div>
        </div>

        <h3>Exam : {currentTest?.exam?.fullName}</h3>
        <h2>Marks Obtained : 180/360</h2>
        <div className={styles.cards}>
          <SubjectCard />
          <SubjectCard />
          <SubjectCard />
        </div>
      </div>
    </div>
  );
};

interface ISubjectCard {}

const SubjectCard = (props: ISubjectCard) => {
  return (
    <div className={styles.subjectCard}>
      <h4>Physics</h4>
      <h5>Attempted : 23/30</h5>
    </div>
  );
};

export default Results;
