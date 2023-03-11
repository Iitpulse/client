import { CheckBox } from "@mui/icons-material";
import clsx from "clsx";
import RenderWithLatex from "../../../../components/RenderWithLatex/RenderWithLatex";
import styles from "../../Questions.module.scss";

const OptionsComp = ({ type, questionObj }: any) => {
  switch (type) {
    case "single":
    case "multiple":
      return (
        <ul className={styles.optionsList}>
          {questionObj?.en.options.map((option: any, i: number) => (
            <li
              key={i}
              className={clsx(
                styles.option,
                questionObj?.correctAnswers?.includes(option.id)
                  ? styles.selected
                  : ""
              )}
            >
              <span className={styles.optionNumber}>
                {String.fromCharCode(65 + i)})
              </span>
              <span
                style={{
                  marginLeft: "0.5rem",
                }}
              >
                <RenderWithLatex quillString={option.value} />
              </span>
              {questionObj?.correctAnswers?.includes(option.id) && (
                <CheckBox className={styles.checkbox} />
              )}
            </li>
          ))}
        </ul>
      );
    case "integer":
      return (
        <span
          className={styles.flexRow}
          style={{
            justifyContent: "flex-start",
          }}
        >
          From:{" "}
          <span
            dangerouslySetInnerHTML={{
              __html: questionObj?.correctAnswer?.from,
            }}
          ></span>{" "}
          | To:{" "}
          <span
            dangerouslySetInnerHTML={{
              __html: questionObj?.correctAnswer?.to,
            }}
          ></span>
        </span>
      );
    default:
      return <></>;
  }
};

export default OptionsComp;
