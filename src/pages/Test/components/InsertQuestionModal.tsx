import { TextField } from "@mui/material";
import { useState } from "react";
import {
  Modal,
  MUIChipsAutocomplete,
  MUISelect,
  StyledMUISelect,
} from "../../../components";
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
  const [difficulty, setDifficulty] = useState("easy");
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

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Insert Question"
      backdropClose={false}
    >
      <div className={styles.insertQuestionModal}>
        <div className={styles.inputFieldsHeader}>
          <StyledMUISelect
            value={difficulty}
            label="Difficulty"
            options={difficultyOptions}
            onChange={setDifficulty}
          />
          <MUIChipsAutocomplete
            label="Chapter(s)"
            options={chapters}
            onChange={setChapters}
          />
        </div>
      </div>
    </Modal>
  );
};

export default InsertQuestionModal;
