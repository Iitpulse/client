import React, { useContext, useEffect, useState } from "react";
import styles from "./Result.module.scss";
import { useNavigate, useParams } from "react-router";
import { Button, Card, Navigate } from "../../components";
import { AuthContext } from "../../utils/auth/AuthContext";
import {
  DetailedAnalysis,
  HeaderDetails,
} from "../DetailedAnalysis/DetailedAnalysis";
import timerIcon from "../../assets/icons/timer.svg";
import { CircularProgress as MUICircularProgress } from "@mui/material";
import MainLayout from "../../layouts/MainLayout";

interface Props {
  finalTest: any;
  hasResultViewPermission: boolean;
}

const colors = ["#55bc7e", "#f8ba1c", "#fc5f5f", "#61b4f1"];
function roundToOne(num: number) {
  return Number(num).toFixed(1);
}

const ResultForStudent: React.FC<Props> = ({
  finalTest,
  hasResultViewPermission,
}) => {
  const navigate = useNavigate();

  const { testId, testName, testExamName } = useParams();

  return (
    <MainLayout name="Result > Student">
      <div className={styles.container}>
        <HeaderDetails
          name={testName || ""}
          type={finalTest?.type || ""}
          languages={[{ name: "English" }, { name: "Hindi" }]}
          duration={finalTest?.duration || 90}
          totalAppeared={finalTest?.totalAppeared || 0}
          highestMarks={finalTest?.highestMarks || 0}
          lowestMarks={finalTest?.lowestMarks || 0}
          averageMarks={finalTest?.averageMarks || 0}
          status={finalTest?.status || ""}
          scheduledFor={finalTest?.scheduledFor || []}
        />
        <div className={styles.content}>
          <StudentResultCore
            finalTest={finalTest}
            hasResultViewPermission={hasResultViewPermission}
          />
        </div>
      </div>
    </MainLayout>
  );
};

export default ResultForStudent;

interface PropsStudentResultCore {
  hasResultViewPermission: boolean;
  finalTest: any;
}

export const StudentResultCore: React.FC<PropsStudentResultCore> = ({
  hasResultViewPermission,
  finalTest,
}) => {
  const { currentUser } = useContext(AuthContext);
  const [finalSections, setFinalSections] = useState<any>([]);
  const [headerData, setHeaderData] = useState<any>({} as any);
  const [viewDetailedAnalysis, setViewDetaildAnalysis] = useState(false);

  const { testId, testName, testExamName } = useParams();

  /*
    Listen to all the changes finalTest obj
  */
  useEffect(() => {
    if (finalTest?.id || finalTest?._id) {
      const { totalMarks, totalTimeTakenInSeconds } = finalTest;
      let totalCorrect = 0;
      let totalAttempted = 0;
      let totalQuestions = 0;
      let totalIncorrect = 0;

      finalTest.sections?.forEach((section: any) => {
        totalQuestions += section.totalQuestions;
        let attempted = 0;
        let correct = 0;
        let incorrect = 0;
        let timeTakenInSeconds = 0;
        let marks = 0;

        section.subSections?.forEach((subSection: any) => {
          Object.values(subSection?.questions)?.forEach((question: any) => {
            const { timeTakenInSeconds: qTimeTakenInSeconds } = question;

            // if not null -> Question is attempted
            if (qTimeTakenInSeconds !== null) {
              attempted += 1;
              totalAttempted += 1;
              marks += question.marks;
              if (question.marks < 0 && question.wrongAnswers.length) {
                incorrect += 1;
                timeTakenInSeconds += qTimeTakenInSeconds;
                totalIncorrect += 1;
              } else if (question.marks > 0 && question.correctAnswers.length) {
                correct += 1;
                totalCorrect += 1;
                timeTakenInSeconds += qTimeTakenInSeconds;
              }
            }
            setFinalSections((prev: any) => ({
              ...prev,
              [section.id]: {
                ...section,
                attempted,
                correct,
                incorrect,
                timeTakenInSeconds,
                marks,
              },
            }));
          });
        });
      });

      if (setHeaderData) {
        setHeaderData({
          totalMarks,
          totalTimeTakenInSeconds,
          totalCorrect,
          totalAttempted,
          totalQuestions,
          totalIncorrect,
        });
      }
    }
  }, [finalTest, currentUser]);

  const navigate = useNavigate();

  return (
    <>
      <Card classes={[styles.basicInfo]}>
        <h3 className={styles.marksObtained}>
          Marks Obtained :{" "}
          <span className={styles.boldLarge}>
            {headerData?.totalMarks || 0}/{headerData?.totalTestMarks || 0}
          </span>
        </h3>
        <h3 className={styles.totalAttempted}>
          Attempted :{" "}
          <span className={styles.boldLarge}>
            {headerData?.totalAttempted || 0}/{headerData?.totalQuestions || 0}
          </span>{" "}
        </h3>
      </Card>
      <div className={styles.cards}>
        {Object.values(finalSections)?.map((item: any, index: number) => (
          <SubjectCard key={item.id} color={colors[index % 4]} {...item} />
        ))}
      </div>
      <Button onClick={() => setViewDetaildAnalysis(true)} color="primary">
        View Detailed Analysis
      </Button>
      {(!hasResultViewPermission || viewDetailedAnalysis) && (
        <DetailedAnalysis sections={Object.values(finalSections)} />
      )}
    </>
  );
};

interface ISubjectCard {
  color: string;
  name: string;
  marks: number;
  maxMarks: number;
  attempted: number;
  correct: number;
  incorrect: number;
  maxTime: string;
  timeTakenInSeconds: number;
  totalQuestions: number;
}

const SubjectCard: React.FC<ISubjectCard> = ({
  color,
  name,
  marks,
  attempted,
  correct,
  incorrect,
  timeTakenInSeconds,
  totalQuestions,
}) => {
  return (
    <div className={styles.subjectCard}>
      <h3 style={{ color }} className={styles.subjectName}>
        {name}
      </h3>
      <div className={styles.mid}>
        <div className={styles.left}>
          <h2 className={styles.marks}>
            {marks}/{360}
          </h2>
          <div className={styles.time}>
            <img src={timerIcon} alt="Time" />
            <p>{timeTakenInSeconds.toFixed(2)}</p>
          </div>
          <p className={styles.accuracy}>
            Accuracy:
            <span className={styles.highlight}>
              {roundToOne((correct / attempted) * 100)}%
            </span>
          </p>
        </div>
        <CircularProgress color={color} progress={(marks / 360) * 100} />
      </div>
      <div className={styles.moreInfo}>
        <p>
          Attempted :<span className={styles.highlight}>{attempted}</span>{" "}
        </p>
        <p>
          Correct :<span className={styles.highlight}>{correct}</span>{" "}
        </p>
        <p>
          Incorrect :<span className={styles.highlight}>{incorrect}</span>{" "}
        </p>
      </div>
    </div>
  );
};

const CircularProgress: React.FC<{ color: string; progress: number }> = ({
  progress,
  color,
}) => {
  return (
    <div className={styles.circularProgress}>
      <MUICircularProgress
        sx={{ color }}
        variant="determinate"
        value={progress}
      />
      <p className={styles.progress}>{roundToOne(progress)}%</p>
    </div>
  );
};
