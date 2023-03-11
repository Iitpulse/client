import CoreQuestionComp from "./CoreQuestionComp";
import { RenderWithLatex } from "../../../../components/";
import styles from "../../Questions.module.scss";

const RenderQuestion = ({ type, questionObj }: any) => {
  return ["single", "multiple", "integer"]?.includes(type) ? (
    <CoreQuestionComp questionObj={questionObj} />
  ) : type === "paragraph" ? (
    <div className={styles.paragraphContainer}>
      <span
        className={styles.flexRow}
        style={{
          alignItems: "flex-start",
          justifyContent: "flex-start",
          gap: "0.5rem",
        }}
      >
        P.
        <RenderWithLatex quillString={questionObj.paragraph} />
      </span>
      <div className={styles.paragraphQuestions}>
        {questionObj?.questions?.map((question: any, i: number) => (
          <CoreQuestionComp
            key={question.id + i}
            questionObj={question}
            displayIndex={i + 1}
          />
        ))}
      </div>
    </div>
  ) : (
    <></>
  );
};

export default RenderQuestion;
