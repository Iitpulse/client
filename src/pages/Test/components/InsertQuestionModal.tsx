import axios from "axios";
import { useEffect, useState } from "react";
import { MUIChipsAutocomplete } from "../../../components";
import CustomModal from "../../../components/CustomModal/CustomModal";
import styles from "../CreateTest.module.scss";

interface Props {
  open: boolean;
  onClose: () => void;
  questions: Array<any>;
  setQuestions: (questions: Array<any>) => void;
  subject: string;
  type: string;
}

const InsertQuestionModal: React.FC<Props> = ({
  open,
  onClose,
  questions,
  setQuestions,
}) => {
  const [difficulties, setDifficulties] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [topics, setTopics] = useState([]);
  const [search, setSearch] = useState("");

  const difficultyOptions = [
    { name: "Easy", value: "easy" },
    { name: "Medium", value: "medium" },
    { name: "Hard", value: "hard" },
  ];

  const chaptersOptions = [
    { name: "Easy", value: "easy" },
    { name: "Medium", value: "medium" },
    { name: "Hard", value: "hard" },
  ];

  async function fetchQuestions() {
    const res = await axios.get("http://localhost:5001/mcq/difficulty", {
      params: {
        difficulties,
      },
    });

    console.log({ res: res.data, difficulties });
    if (res.data?.length) {
      setQuestions(res.data);
    }
  }

  useEffect(() => {
    if (difficulties?.length) {
      fetchQuestions();
    }
  }, [difficulties]);

  return (
    <CustomModal open={open} handleClose={onClose} title="Insert Question">
      <div className={styles.insertQuestionModal}>
        <div className={styles.inputFieldsHeader}>
          <MUIChipsAutocomplete
            label="Difficulty(s)"
            options={difficultyOptions}
            onChange={setDifficulties}
          />
          <MUIChipsAutocomplete
            label="Chapter(s)"
            options={chaptersOptions}
            onChange={setChapters}
          />
        </div>
      </div>
      {questions.map((question: any) => (
        <div className={styles.modalQuestion}>
          <div
            key={question.id}
            dangerouslySetInnerHTML={{ __html: question?.en?.question }}
          ></div>
          <div className={styles.options}>
            {question.en.options.map((option: any) => (
              <div dangerouslySetInnerHTML={{ __html: option.value }}></div>
            ))}
          </div>
        </div>
      ))}
    </CustomModal>
  );
};

export default InsertQuestionModal;
