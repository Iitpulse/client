import { TextField } from "@mui/material";
import axios from "axios";
import { useEffect, useState, useRef } from "react";
import { MUIChipsAutocomplete } from "../../../components";
import CustomDialog from "../../../components/CustomDialog/CustomDialog";
import CustomModal from "../../../components/CustomModal/CustomModal";
import { StyledMUITextField } from "../../Users/components";
import styles from "../CreateTest.module.scss";
import MUISimpleAutocomplete from "./MUISimpleAutocomplete";
import { Table, Tag } from "antd";
import CustomTable from "../../../components/CustomTable/CustomTable";
import RenderWithLatex from "../../../components/RenderWithLatex/RenderWithLatex";
import { API_QUESTIONS } from "../../../utils/api/config";
import { Input, Button, Space } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

interface Props {
  open: boolean;
  onClose: () => void;
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
  const [questions, setQuestions] = useState<Array<any>>([]);
  const [searchText, setSearchText] = useState('');
  const [searchedColumn, setSearchedColumn] = useState('');


  const difficultyOptions = [
    { name: "Easy", value: "easy" },
    { name: "Medium", value: "medium" },
    { name: "Hard", value: "hard" },
  ];

  const handleSearch = (selectedKeys:any, confirm:any) => {
    confirm();
  };
  
  const handleReset = (clearFilters:any) => {
    clearFilters();
  };
  


  const cols:any = [
    {
      title: "Question",
      dataIndex: "en",
      key: "question",
      width: "40%",
      fixed: "left",
      // searchable: true,
      render: (en: any) => (
        <div
          style={{
            width: "100%",
            overflow: "hidden",
            textOverflow: "ellipsis",
            // whiteSpace: "nowrap",
          }}
        >
          <RenderWithLatex quillString={en?.question} />
        </div>
      ),
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }:any) => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder="Search Question"
            value={selectedKeys[0]}
            onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
            onPressEnter={() => handleSearch(selectedKeys, confirm)}
            style={{ width: 188, marginBottom: 8, display: 'block' }}
          />
          <Button
            type="primary"
            onClick={() => handleSearch(selectedKeys, confirm)}
            icon={<SearchOutlined />}
            size="small"
            style={{ width: 90, marginRight: 8 }}
          >
            Search
          </Button>
          <Button onClick={() => handleReset(clearFilters)} size="small" style={{ width: 90 }}>
            Reset
          </Button>
        </div>
      ),
      onFilter: (value:any, record:any) => record.en?.question?.toLowerCase().includes(value.toLowerCase()),
    },
    {
      title: "Difficulty",
      dataIndex: "difficulty",
      key: "difficulty",
      width: "15%",
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
        record.difficulty.toLowerCase().indexOf(value) === 0,
      sorter: (a: any, b: any) => a.difficulty.length - b.difficulty.length,
      sortDirections: ["descend", "ascend"],
    },
    {
      title: "Chapter(s)",
      dataIndex: "chapters",
      key: "chapter",
      width: "25%",
      // searchable: true,
      render: (chapters: any) => (
        <>
          {chapters?.map((chapter: any) => (
            <Tag> {chapter.name}</Tag>
          ))}
        </>
      ),
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }:any) => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder="Search Chapter"
            value={selectedKeys[0]}
            onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
            onPressEnter={() => handleSearch(selectedKeys, confirm)}
            style={{ width: 188, marginBottom: 8, display: 'block' }}
          />
          <Button
            type="primary"
            onClick={() => handleSearch(selectedKeys, confirm)}
            icon={<SearchOutlined />}
            size="small"
            style={{ width: 90, marginRight: 8 }}
          >
            Search
          </Button>
          <Button onClick={() => handleReset(clearFilters)} size="small" style={{ width: 90 }}>
            Reset
          </Button>
        </div>
      ),
      onFilter: (value:any, record:any) => (record.chapters.map((item:any)=>item.name.toLowerCase())).includes(value.toLowerCase()),
    },
    {
      title: "Proof Read?",
      dataIndex: "isProofRead",
      key: "isProofRead",
      width: "20%",
      render: (isProofRead: boolean) => <p>{isProofRead ? "Yes" : "No"}</p>,
    },
  ];

  async function fetchQuestions() {
    // console.log({ subject });
    const res = await API_QUESTIONS().get(`/mcq/all`, {
      params: { subject, size:Number.MAX_SAFE_INTEGER },
    });

    // console.log({ res: res.data, difficulties });
    console.log(res.data);
    if (res.data.data?.length) {
      setQuestions(res.data.data);
    }
  }

  useEffect(() => {
    if (open) {
      setQuestions([]);
      fetchQuestions();
    }
  }, [open, subject]);

  useEffect(() => {
    if (subject) {
      API_QUESTIONS()
        .get(`/subject/chapter/`, {
          params: {
            subject,
          },
        })
        .then((res) => {
          // console.log({ res });
          setChaptersOptions(
            res.data?.map((chapter: any) => ({
              ...chapter,
              value: chapter.name,
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
        {console.log({questions})}
        <div className={styles.questionsTable}>
          <CustomTable
            selectable
            columns={cols as any}
            dataSource={questions}
            setSelectedRows={setSelectedQuestions}
          />
        </div>
      </div>
    </CustomDialog>
  );
};

export default InsertQuestionModal;


