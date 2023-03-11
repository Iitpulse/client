import RenderWithLatex from "../../../../components/RenderWithLatex/RenderWithLatex";
import styles from "../../Questions.module.scss";
import OptionsComp from "./OptionsComp";

const CoreQuestionComp = ({
  questionObj,
  displayIndex,
}: {
  questionObj: any;
  displayIndex?: number;
}) => {
  return (
    <div className={styles.questionContainerTable}>
      {/* <RenderWithLatex quillString={getCombinedQuestion(questionObj)} /> */}
      <span
        className={styles.flexRow}
        style={{
          alignItems: "flex-start",
          justifyContent: "flex-start",
          gap: "0.5rem",
        }}
      >
        Q{displayIndex ?? ""}.
        <RenderWithLatex quillString={questionObj.en.question} />
      </span>
      <OptionsComp type={questionObj.type} questionObj={questionObj} />
      <div className={styles.solutionContainer}>
        <p>Solution</p>
        <RenderWithLatex quillString={questionObj.en.solution} />
      </div>
    </div>
  );
};

export default CoreQuestionComp;
