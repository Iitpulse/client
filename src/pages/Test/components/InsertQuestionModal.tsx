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
import CustomTable from "../../../components/CustomTable/CustomTable";
import RenderWithLatex from "../../../components/RenderWithLatex/RenderWithLatex";
import { API_QUESTIONS } from "../../../utils/api";

interface Props {
  open: boolean;
  onClose: () => void;
  questions: Array<any>;
  setQuestions: (questions: Array<any>) => void;
  subject: string;
  totalQuestions: number;
  type: string;
  handleClickSave: (rows: Array<any>) => void;
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
  handleClickSave,
}) => {
  const [difficulties, setDifficulties] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [topics, setTopics] = useState([]);
  const [search, setSearch] = useState("");
  const [chaptersOptions, setChaptersOptions] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Array<any>>([]);

  const difficultyOptions = [
    { name: "Easy", value: "easy" },
    { name: "Medium", value: "medium" },
    { name: "Hard", value: "hard" },
  ];

  // const chaptersOptions = [
  //   { name: "Easy", value: "easy" },
  //   { name: "Medium", value: "medium" },
  //   { name: "Hard", value: "hard" },
  // ];

  async function fetchQuestions() {
    const res = await API_QUESTIONS().get(`/mcq/all`);

    console.log({ res: res.data, difficulties });
    if (res.data?.length) {
      setQuestions(res.data);
    }
  }

  useEffect(() => {
    fetchQuestions();
  }, []);

  useEffect(() => {
    if (subject) {
      API_QUESTIONS()
        .get(`/mcq/chapter/`, {
          params: {
            subject,
          },
        })
        .then((res) => {
          console.log({ res });
          setChaptersOptions(
            res.data?.map((chapter: any) => ({
              ...chapter,
              value: chapter.name?.toLowerCase(),
            }))
          );
        });
    }
  }, [subject]);

  return (
    <CustomDialog
      open={open}
      handleClose={onClose}
      actionBtnText="Save"
      title="Insert Question"
      onClickActionBtn={() => handleClickSave(selectedQuestions)}
    >
      <div className={styles.insertQuestionModal}>
        {/* <div className={styles.inputFieldsHeader}>
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
        </div> */}
        <div className={styles.questionsTable}>
          <CustomTable
            columns={cols as any}
            dataSource={questions?.map((question) => ({
              ...question,
              key: question.id || question._id,
            }))}
            setSelectedRows={selectedQuestions}
            // expandable={{
            //   expandedRowRender: (record) => (
            //     <div
            //       style={{ margin: "0 auto", width: "70%" }}
            //       className={styles.flexRow}
            //     >
            //       {record?.en?.options?.map((option: any, i: number) => (
            //         <div key={i}>
            //           <span>{String.fromCharCode(64 + i + 1)})</span>
            //           <div
            //             dangerouslySetInnerHTML={{ __html: option.value }}
            //           ></div>
            //         </div>
            //       ))}
            //     </div>
            //   ),
            // }}
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
    width: "300",
    fixed: "left",
    searchable: true,
    render: (en: any) => (
      <div
        style={{
          width: "300px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        <RenderWithLatex quillString={en?.question} />
      </div>
    ),
  },
  {
    title: "Difficulty",
    dataIndex: "difficulty",
    key: "difficulty",
    width: "100",
    filters: [
      {
        text: "Easy",
        value: "easy",
      },
      {
        text: "Medium",
        value: "medium",
      },
      {
        text: "Hard",
        value: "hard",
      },
    ],
    onFilter: (value: any, record: any) =>
      record.difficulty.indexOf(value) === 0,
    sorter: (a: any, b: any) => a.difficulty.length - b.difficulty.length,
    sortDirections: ["descend", "ascend"],
  },
  {
    title: "Chapter(s)",
    dataIndex: "chapters",
    key: "chapter",
    width: "100",
    searchable: true,
    render: (chapters: any) => <p>{chapters?.join(", ")}</p>,
  },
  {
    title: "Proof Read?",
    dataIndex: "isProofRead",
    key: "isProofRead",
    width: "100",
    render: (isProofRead: boolean) => <p>{isProofRead ? "Yes" : "No"}</p>,
  },
];
