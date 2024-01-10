import { TextField } from "@mui/material";
import axios from "axios";
import { useEffect, useState, useRef, useContext } from "react";

import { MUIChipsAutocomplete } from "../../../components";
import CustomDialog from "../../../components/CustomDialog/CustomDialog";
import CustomModal from "../../../components/CustomModal/CustomModal";
import { StyledMUITextField } from "../../Users/components";
import styles from "../CreateTest.module.scss";
import MUISimpleAutocomplete from "./MUISimpleAutocomplete";
import { Button, Select, Tag } from "antd";

import CustomTable from "../../../components/CustomTable/CustomTable";
import RenderWithLatex from "../../../components/RenderWithLatex/RenderWithLatex";
import { API_QUESTIONS } from "../../../utils/api/config";
import { Input } from "antd";
import { TestContext } from "../../../utils/contexts/TestContext";
import { AuthContext } from "../../../utils/auth/AuthContext";
import { useNavigate } from "react-router";
import type { CustomTagProps } from "rc-select/lib/BaseSelect";
import { SearchOutlined } from "@mui/icons-material";
import { AllQuestionsTable } from "../../Questions/Questions";

const { Search } = Input;
interface Props {
  open: boolean;
  onClose: () => void;
  subject: string;
  totalQuestions: number;
  type: string;
  handleClickSave: (rows: Array<any>) => void;
  selectedTempQuestions: Array<any>;
  maxSelectedQuestions: number;
  subjectSelected: any;
  typeSelected: any;
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

interface IOptionType {
  name: string;
  inputValue?: string;
  value?: string | number;
}

const arrsub = [
  "Physics",
  "Chemistry",
  "Mathematics",
  "Biology",
  "Computer",
  "Commerce",
  "test",
  "another test",
  "testing again",
  "Test Subject",
  "Test Subject 2",
  "Test Subject 3",
  "Test Subject 4",
  "Test Subject 5",
  "Test Subject 6",
  "Test Subject 7",
];
const InsertQuestionModal: React.FC<Props> = ({
  open,
  onClose,
  totalQuestions,
  subject,
  handleClickSave,
  selectedTempQuestions,
  maxSelectedQuestions,
  subjectSelected,
  typeSelected,
}) => {
  const [difficulties, setDifficulties] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [topics, setTopics] = useState([]);
  const [search, setSearch] = useState("");
  const [chaptersOptions, setChaptersOptions] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Array<any>>(
    selectedTempQuestions
  );
  const { subjects } = useContext(TestContext);

  console.log({ selectedTempQuestions, selectedQuestions });
  const [questions, setQuestions] = useState<Array<any>>([]);
  const [searchText, setSearchText] = useState("");
  const [searchedColumn, setSearchedColumn] = useState("");
  const [loading, setLoading] = useState(false);
  const [globalSearch, setGlobalSearch] = useState<string>("");
  const globalSearchRef = useRef<any>(null);
  const [totalDocs, setTotalDocs] = useState(1);

  const [timeoutNumber, setTimeoutNumber] = useState<any>(null);
  const [filterType, setFilterType] = useState<any>([typeSelected]);
  const [filterTypeReq, setFilterTypeReq] = useState<any>([typeSelected]);
  const [filterDifficulty, setFilterDifficulty] = useState<any>([]);
  const [filterDifficultyReq, setFilterDifficultyReq] = useState<any>([
    "Easy",
    "Medium",
    "Hard",
  ]);
  // console.log({ subjectSelected, subjects });

  const [filterSubjects, setFilterSubjects] = useState<any>([]);
  console.log({ subjectSelected });
  const [filterSubjectsReq, setFilterSubjectsReq] = useState<any>([]);
  const [filterChapters, setFilterChapters] = useState<any>([]);
  const [filterChaptersReq, setFilterChaptersReq] = useState<any>([]);
  const [filterTopics, setFilterTopics] = useState<Array<String>>([""]);
  const [filterTopicsReq, setFilterTopicsReq] = useState<Array<any>>([]);

  const [topicOptions, setTopicOptions] = useState<any>([]);
  const [chapterOptions, setChapterOptions] = useState<any>([]);

  useEffect(() => {
    let selectedSub = subjects?.find(
      (s) => s?.name?.toLowerCase() === subjectSelected?.toLowerCase()
    );
    console.log({ selectedSub });
    if (selectedSub) {
      setFilterSubjects([selectedSub]);
      setFilterSubjectsReq([selectedSub?.name]);
    }
  }, [subjectSelected]);

  async function fetchQuestions() {
    // console.log({ subject });
    setLoading(true);
    const res = await API_QUESTIONS().get(`/mcq/all`, {
      params: { subject, size: Number.MAX_SAFE_INTEGER },
    });

    // console.log({ res: res.data, difficulties });
    console.log(res.data);
    if (res.data.data?.length) {
      const questionData = res.data.data.map((item: any) => ({
        key: item.id,
        ...item,
      }));
      setQuestions(questionData);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (open) {
      setQuestions([]);
      // fetchQuestions();
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

  async function onChangePageOrPageSize(page?: number, pageSize?: number) {
    // console.log(filterSubjects);
    setLoading(true);
    try {
      const res = await API_QUESTIONS().get(`/mcq/all`, {
        params: {
          page,
          size: pageSize || 10,
          search: globalSearch, // I Wrote this line
          type: filterTypeReq,
          difficulty: filterDifficultyReq,
          sub: filterSubjectsReq,
          chapters: filterChaptersReq,
          topics: filterTopicsReq,
        },
      });
      // console.log({ data: res.data });
      setQuestions(res.data.data);
      setTotalDocs(res.data.totalDocs);
      setLoading(false);
    } catch (err) {
      console.log(err);
      setLoading(false);
    }
  }

  useEffect(() => {
    async function debounceGlobalSearch() {
      console.log("calling debounceGlobalSearch");
      clearTimeout(timeoutNumber);
      setTimeoutNumber(setTimeout(onChangePageOrPageSize, 600));
    }
    debounceGlobalSearch();
  }, [globalSearch]);

  useEffect(() => {
    onChangePageOrPageSize();
  }, [
    filterTypeReq,
    filterChaptersReq,
    filterDifficultyReq,
    filterSubjectsReq,
    filterTopicsReq,
  ]);

  const typeOptions = [
    { label: "Single", value: "single" },
    { label: "Multiple", value: "multiple" },
    { label: "Integer", value: "integer" },
    { label: "Paragraph", value: "paragraph" },
    { label: "Matrix", value: "matrix" },
  ];
  const difficultyOptions = [
    { label: "Easy", value: "Easy" },
    { label: "Medium", value: "Medium" },
    { label: "Hard", value: "Hard" },
  ];

  function handleChangeType(values: string[]) {
    setFilterType(values);
    if (values.length === 0) {
      setFilterTypeReq([
        "single",
        "multiple",
        "integer",
        "paragraph",
        "matrix",
      ]);
    } else setFilterTypeReq(values);
  }

  function handleChangeDifficulty(values: string[]) {
    setFilterDifficulty(values);
    if (values.length === 0) {
      setFilterDifficultyReq(["Easy", "Medium", "Hard"]);
    } else setFilterDifficultyReq(values);
  }

  function handleChangeSubjects(_: any, options: any[]) {
    setFilterSubjects(options);
    if (options.length >= 1) {
      let ar = [];
      for (var i = 0; i < options.length; i++) {
        ar.push(options[i].value);
      }
      setFilterSubjectsReq(ar);
      console.log(filterSubjectsReq);
    } else {
      setFilterSubjectsReq(arrsub);
      // let ar = [];
      // for(var i = 0; i<subjects.length; i++){
      //   ar.push(subjects[i].name);
      // }
      // // setFilterSubjectsReq(ar);
      // console.log(filterSubjectsReq);
    }
  }

  function handleChangeChapters(_: any, options: any) {
    setFilterChapters(options);
    // console.log(options);
    if (options.length) {
      let arr: any = [];
      // options?.map((opt : any)=>{arr.push({
      //   name: opt.name,
      //   topics: opt.topics,
      //   _id: opt.id
      // })});
      options?.map((opt: any) => {
        arr.push(opt.name);
      });
      setFilterChaptersReq(arr);
    } else setFilterChaptersReq([]);
    console.log(filterChaptersReq);
  }

  function handleChangeTopics(options: String[]) {
    // console.log(options);
    setFilterTopics(options);
    setFilterTopicsReq(options);
  }

  const tagRender = (props: CustomTagProps) => {
    const { label, value, closable, onClose } = props;
    const onPreventMouseDown = (event: React.MouseEvent<HTMLSpanElement>) => {
      event.preventDefault();
      event.stopPropagation();
    };
    return (
      <Tag
        color={
          value === "Easy"
            ? "green"
            : value.toLowerCase() === "medium"
            ? "yellow"
            : "red"
        }
        onMouseDown={onPreventMouseDown}
        closable={closable}
        onClose={onClose}
        style={{ marginRight: 3 }}
      >
        {label}
      </Tag>
    );
  };

  useEffect(() => {
    function getSelectSubjectChapters(): any[] {
      let chapters: any[] = [];
      filterSubjects?.forEach((subject: any) => {
        if (subject.chapters)
          chapters.push(
            ...subject.chapters?.map((chapter: any) => ({
              label: `[${subject.name?.slice(0, 1)}] ${chapter.name}`,
              value: chapter.name,
              ...chapter,
            }))
          );
      });
      return chapters;
    }
    if (filterSubjects?.length) setChapterOptions(getSelectSubjectChapters());
    else setChapterOptions([]);
  }, [filterSubjects]);

  useEffect(() => {
    function getSelectedChapterTopics(): any[] {
      let topics = new Set();
      filterChapters?.forEach((chapter: any) => {
        if (chapter.topics) topics.add([...chapter.topics]);
      });
      // console.log(topics);
      return [...topics]
        .filter((topic: any) => topic?.length)
        .map((topic: any) => ({
          label: topic[0],
          value: topic[0],
        }));
    }
    if (filterChapters?.length) setTopicOptions(getSelectedChapterTopics());
    else setTopicOptions([]);
  }, [filterChapters]);
  console.log({ difficultyOptions, typeOptions, subjects });
  return (
    <CustomDialog
      open={open}
      handleClose={onClose}
      actionBtnText="Save"
      title="Insert Question"
      onClickActionBtn={() => handleClickSave(selectedQuestions)}
    >
      <div className={styles.questionsHeader}>
        <div className={styles.searchAndPrint}>
          <Search
            ref={globalSearchRef}
            placeholder="Search Question"
            allowClear
            enterButton
            loading={loading}
            onSearch={setGlobalSearch}
            style={{
              maxWidth: 500,
            }}
          />
        </div>

        <div className={styles.filters}>
          <Select
            mode="multiple"
            allowClear
            placeholder="Type"
            disabled
            options={typeOptions}
            value={filterType}
            maxTagCount="responsive"
            showArrow
            style={{
              borderRadius: "8 px",
              minWidth: 180,
              zIndex: "10000",
            }}
          />
          <Select
            mode="multiple"
            allowClear
            placeholder="Difficulty"
            tagRender={tagRender}
            onChange={handleChangeDifficulty}
            options={difficultyOptions}
            maxTagCount="responsive"
            showArrow
            style={{
              borderRadius: "8 px",
              minWidth: 180,
            }}
          />
          <Select
            mode="multiple"
            allowClear
            placeholder="Subject"
            onChange={handleChangeSubjects}
            options={subjects?.map((item: any) => ({
              label: item.name,
              value: item.name,
              ...item,
            }))}
            disabled
            value={filterSubjects?.map((item: any) => item.name)}
            maxTagCount="responsive"
            showArrow
            style={{
              borderRadius: "8 px",
              minWidth: 180,
            }}
          />
          <Select
            mode="multiple"
            allowClear
            placeholder="Chapter(s)"
            onChange={handleChangeChapters}
            options={chapterOptions}
            maxTagCount="responsive"
            showArrow
            style={{
              borderRadius: "8 px",
              minWidth: 180,
            }}
          />
          <Select
            mode="multiple"
            allowClear
            placeholder="Topic(s)"
            onChange={handleChangeTopics}
            options={topicOptions}
            maxTagCount="responsive"
            showArrow
            style={{
              borderRadius: "8 px",
              minWidth: 180,
            }}
          />
        </div>
      </div>
      <div className={styles.insertQuestionModal}>
        {/* <div className={styles.questionsTable}>

          <CustomTable
            loading={loading}
            selectable
            columns={questions as any}
            dataSource={questions}
            setSelectedRows={setSelectedQuestions}
          />
        </div> */}
        <div className={styles.tableContainer}>
          <AllQuestionsTable
            enableSelect={true}
            noDelete={true}
            maxSelectedQuestions={maxSelectedQuestions}
            selectedQuestions={selectedQuestions}
            setSelectedQuestions={setSelectedQuestions}
            questions={questions}
            loading={loading}
            noEdit={true}
            pagination={{
              total: totalDocs,
              onChange: onChangePageOrPageSize,
              onShowSizeChange: onChangePageOrPageSize,
            }}
          />
        </div>
      </div>
    </CustomDialog>
  );
};

export default InsertQuestionModal;
