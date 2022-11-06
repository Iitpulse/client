import styles from "../Result.module.scss";
import timerIcon from "../../../assets/icons/timer.svg";
import { CircularProgress as MUICircularProgress } from "@mui/material";
import { roundToOne } from "../../../utils";

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
