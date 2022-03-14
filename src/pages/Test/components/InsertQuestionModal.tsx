import { TextField } from "@mui/material";
import axios from "axios";
import { useEffect, useState } from "react";
import { MUIChipsAutocomplete } from "../../../components";
import CustomDialog from "../../../components/CustomDialog/CustomDialog";
import CustomModal from "../../../components/CustomModal/CustomModal";
import { StyledMUITextField } from "../../Users/components";
import styles from "../CreateTest.module.scss";
import MUISimpleAutocomplete from "./MUISimpleAutocomplete";
import { Table } from "antd";

interface Props {
  open: boolean;
  onClose: () => void;
  questions: Array<any>;
  setQuestions: (questions: Array<any>) => void;
  subject: string;
  totalQuestions: number;
  type: string;
}

const rowSelection = {
  onChange: (selectedRowKeys: any, selectedRows: any) => {
    console.log(
      `selectedRowKeys: ${selectedRowKeys}`,
      "selectedRows: ",
      selectedRows
    );
  },
  onSelect: (record: any, selected: any, selectedRows: any) => {
    console.log(record, selected, selectedRows);
  },
  onSelectAll: (selected: any, selectedRows: any, changeRows: any) => {
    console.log(selected, selectedRows, changeRows);
  },
};

const InsertQuestionModal: React.FC<Props> = ({
  open,
  onClose,
  questions,
  setQuestions,
  totalQuestions,
  subject,
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
    } else {
      setQuestions([]);
    }
  }, [difficulties]);

  return (
    <CustomDialog
      open={open}
      handleClose={onClose}
      actionBtnText="Save"
      title="Insert Question"
      onClickActionBtn={() => {}}
    >
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
          <TextField label="Subject" disabled value={subject} />
          <TextField label="Total Questions" disabled value={totalQuestions} />
          <MUISimpleAutocomplete
            label="Search Question"
            // value={search}
            options={[]}
            onChange={setSearch}
          />
        </div>
        <div className={styles.questionsTable}>
          <Table
            columns={cols}
            dataSource={questions?.map((question) => ({
              ...question,
              key: question.id || question._id,
            }))}
            rowSelection={{ ...rowSelection }}
            scroll={{
              y: "50vh",
            }}
            expandable={{
              expandedRowRender: (record) => (
                <div
                  style={{ margin: "0 auto", width: "70%" }}
                  className={styles.flexRow}
                >
                  {record?.en?.options?.map((option: any, i: number) => (
                    <div key={i}>
                      <span>{String.fromCharCode(64 + i + 1)})</span>
                      <div
                        dangerouslySetInnerHTML={{ __html: option.value }}
                      ></div>
                    </div>
                  ))}
                </div>
              ),
            }}
          />
        </div>
      </div>
    </CustomDialog>
  );
};

export default InsertQuestionModal;

const cols = [
  {
    title: "Question",
    dataIndex: "en",
    key: "question",
    render: (en: any) => (
      <div dangerouslySetInnerHTML={{ __html: en.question }}></div>
    ),
  },
  {
    title: "Difficulty",
    dataIndex: "difficulty",
    key: "difficulty",
  },
  {
    title: "Chapter(s)",
    dataIndex: "chapters",
    key: "chapter",
    render: (chapters: any) => <p>{chapters?.join(", ")}</p>,
  },
  {
    title: "Proof Read?",
    dataIndex: "isProofRead",
    key: "isProofRead",
    render: (isProofRead: boolean) => <p>{isProofRead ? "Yes" : "No"}</p>,
  },
];
