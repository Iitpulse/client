import styles from "../Result.module.scss";
import timerIcon from "../../../assets/icons/timer.svg";
import { CircularProgress as MUICircularProgress } from "@mui/material";
import { roundToOne } from "../../../utils";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { Card } from "../../../components";

ChartJS.register(ArcElement, Tooltip, Legend);

interface ISubjectCard {
  color: "primary" | "success" | "warning" | "error";
  name: string;
  marks: number;
  maxMarks: number;
  attempted: number;
  correct: number;
  incorrect: number;
  maxTime: string;
  timeTakenInSeconds: number;
  totalQuestions: number;
  totalMarksPerSection: number;
  positiveScore: number;
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
  totalMarksPerSection,
  positiveScore,
}) => {
  // console.log("marks", totalMarksPerSection);
  const chartData = {
    labels: ["Correct", "Incorrect", "Unattemped"],
    datasets: [
      {
        label: "# of Votes",
        data: [correct, incorrect, totalQuestions / 3 - (correct + incorrect)],
        backgroundColor: ["#54B435", "red", "#bebe00"], //green, red, yellow
        borderColor: ["#54B435", "red", "#bebe00"],
        borderWidth: 1,
      },
    ],
  };

  return (
    <Card
      classes={[styles.subjectCard, styles[`card_${color}`]]}
      disablePadding
    >
      <div className={styles.header}>
        <h3 className={styles.subjectName}>{name?.toUpperCase()}</h3>
        <h2 className={styles.marks}>
          {marks}/{totalMarksPerSection}
        </h2>
        <div className={styles.mid}>
          <div className={styles.left}>
            <p className={styles.accuracy}>
              Accuracy:
              <span style={{ color: "black" }}>
                {attempted !== 0 ? roundToOne((correct / attempted) * 100) : 0}%
              </span>
            </p>
            <p className={styles.accuracy}>
              {/* <img src={timerIcon} alt="Time" style={{ filter: "invert(1)" }} />
              &nbsp; */}
              Total Time Taken:
              <span style={{ color: "black" }}>
                {timeTakenInSeconds.toFixed(2)}s
              </span>
            </p>
          </div>
          {/* <div className={styles.right}>
            <p>
              Positive Marks :<span style={{ color: "black" }}>{attempted}</span>{" "}
            </p>
          </div> */}
          {/* <CircularProgress color={color} progress={(marks / totalMarksSection) * 100} /> */}
        </div>
      </div>
      <div className={styles.content}>
        <div className={styles.moreInfo}>
          <p>
            Visited :<span className={styles.highlight}>{attempted}</span>{" "}
          </p>
          <p>
            Attempted :
            <span className={styles.highlight}>{correct + incorrect}</span>{" "}
          </p>
          <p>
            Correct :<span className={styles.highlight}>{correct}</span>{" "}
          </p>
          <p>
            Incorrect :<span className={styles.highlight}>{incorrect}</span>{" "}
          </p>
          <p>
            Positive Marks :
            <span className={styles.highlight}>{positiveScore}</span>{" "}
          </p>
        </div>
        <div className={styles.pieContainer}>
          <Doughnut
            options={{
              plugins: {
                legend: {
                  display: false,
                },
              },
            }}
            className={styles.pie}
            data={chartData}
          />
        </div>
      </div>
    </Card>
  );
};

export default SubjectCard;

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
