import {
  useState,
  useContext,
  useEffect,
  useRef,
  DetailedHTMLProps,
  HTMLAttributes,
} from "react";
import styles from "./Questions.module.scss";
import { Sidebar, Button, Card, InputField } from "../../components";
import "react-quill/dist/quill.snow.css";
import Objective from "./Objective/Objective";
import Integer from "./Integer/Integer";
import Paragraph from "./Paragraph/Paragraph";
import { PreviewHTMLModal, QuestionsTable } from "./components";
import MatrixMatch from "./MatrixMatch/MatrixMatch";
import { IQuestionObjective, IQuestionInteger } from "../../utils/interfaces";
import { AuthContext } from "../../utils/auth/AuthContext";
import { usePermission } from "../../utils/contexts/PermissionsContext";
import { PERMISSIONS, QUESTION_COLS_ALL } from "../../utils/constants";
import { Error } from "..";
import { CSVLink } from "react-csv";
import { useReactToPrint } from "react-to-print";
import { useNavigate } from "react-router-dom";
import { Grid, IconButton } from "@mui/material";
import logo from "../../assets/images/logo.svg";
import { asBlob } from "html-docx-js-typescript";
import { saveAs } from "file-saver";
import * as Docx from "docx"; // that is a peer dependency
import { DeleteOutline, Visibility } from "@mui/icons-material";
import RenderWithLatex from "../../components/RenderWithLatex/RenderWithLatex";
import { API_QUESTIONS } from "../../utils/api";
import PrintIcon from "@mui/icons-material/Print";
import sheetIcon from "../../assets/icons/sheets.svg";
import MainLayout from "../../layouts/MainLayout";
import { Divider, message, Select, Tag } from "antd";
import { ToggleButton } from "../../components";
import CustomPopConfirm from "../../components/PopConfirm/CustomPopConfirm";
import Edit from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import { getTopics } from "../../utils/constants";
import { TestContext } from "../../utils/contexts/TestContext";
import type { CustomTagProps } from "rc-select/lib/BaseSelect";
import { Input } from "antd";
const { Search } = Input;

export const questionTypes = [
  { name: "Objective", value: "objective" },
  // { name: "Multiple Correct", value: "multiple" },
  { name: "Integer Type", value: "integer" },
  { name: "Paragraph", value: "paragraph" },
  { name: "Matrix Match", value: "matrix" },
];

// export const topicOptions = [
//   { name: `Coulomb's law`, value: "coulombsLaw" },
//   { name: "Organic", value: "organic" },
//   { name: "Hydrocarbons", value: "hydrocarbons" },
//   { name: "Probability", value: "probability" },
//   { name: "Tangets", value: "tangets" },
//   { name: "Ideal Gas Equation", value: "idealGasEquation" },
//   { name: "Dual Nature", value: "dualNature" },
//   { name: "Normals", value: "normals" },
//   { name: `Newton's Law of Motion`, value: "newtonsLawofMotion" },
// ];

export const difficultyLevels = [
  { name: "Easy", value: "easy" },
  { name: "Medium", value: "medium" },
  { name: "Hard", value: "hard" },
];

export const sources = [
  { name: "Bansal Classes", value: "bansalClasses" },
  { name: "Allen", value: "allen" },
  { name: "Catalyser", value: "catalyser" },
];

export const examList = [
  {
    name: "JEE MAINS",
    value: "JEEMains",
  },
  {
    name: "JEE ADVANCED",
    value: "JEEAdvanced",
  },
  {
    name: "NEET UG",
    value: "NEETUG",
  },
];
interface IOptionType {
  name: string;
  inputValue?: string;
  value?: string | number;
}

const Questions = () => {
  const isReadPermitted = usePermission(PERMISSIONS.QUESTION.READ);
  const isReadGlobalPermitted = usePermission(PERMISSIONS.QUESTION.READ_GLOBAL);
  const isCreatePermitted = usePermission(PERMISSIONS.QUESTION.CREATE);
  const isUpdatePermitted = usePermission(PERMISSIONS.QUESTION.UPDATE);
  const isDeletePermitted = usePermission(PERMISSIONS.QUESTION.DELETE);

  const [loading, setLoading] = useState<boolean>(false);
  const [totalDocs, setTotalDocs] = useState(1);
  const [sidebarOpen, setSideBarOpen] = useState<boolean>(false);
  const [sidebarContent, setSidebarContent] = useState<any>(null);
  const [questions, setQuestions] = useState([]);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [previewData, setPreviewData] = useState<any>({});
  const [quillStringForPreview, setQuillStringForPreview] = useState<any>("");
  const [globalSearch, setGlobalSearch] = useState<string>("");
  const globalSearchRef = useRef<any>(null);
  const [timeoutNumber, setTimeoutNumber] = useState<any>(null);
  const [filterSubjects, setFilterSubjects] = useState<any>([]);
  const [filterChapters, setFilterChapters] = useState<any>([]);
  const [filterTopics, setFilterTopics] = useState<any>([]);
  const [topicOptions, setTopicOptions] = useState<any>([]);
  const [chapterOptions, setChapterOptions] = useState<any>([]);

  const { currentUser } = useContext(AuthContext);
  const { subjects } = useContext(TestContext);

  const tableRef = useRef<any>(null);

  const handlePrint = async () => {
    const data = await asBlob(tableRef.current.innerHTML, {
      orientation: "portrait",
      margins: { top: 100 },
    });
    // asBlob(tableRef.current.innerHTML).then((data) => {
    // @ts-ignore
    saveAs(data, "file.docx"); // save as docx file
    // }); // asBlob() return Promise<Blob|Buffer>
  };

  useEffect(() => {
    if (previewData?.type === "single" || previewData?.type === "multiple") {
      setQuillStringForPreview(
        previewData?.en?.question +
          previewData?.en?.options
            .map(
              (op: any, idx: number) =>
                `<span style='display:flex;justify-content:flex-start;margin:1rem 0;background:${
                  previewData.correctAnswers.includes(op.id)
                    ? "rgba(85, 188, 126, 0.3)"
                    : "transparent"
                };border-radius:5px;padding:0.4rem 0.6rem;'> ${String.fromCharCode(
                  idx + 65
                )}. <span style='margin-left:1rem;'>${op.value}</span></span>`
            )
            .join("")
      );
    }
  }, [previewData]);

  useEffect(() => {
    setSidebarContent(
      <PreviewFullQuestion
        setQuestions={setQuestions}
        setPreviewData={setPreviewData}
        handleClose={() => {
          setSideBarOpen(false);
          setPreviewData({});
        }}
        quillStringQuestion={quillStringForPreview}
        quillStringSolution={previewData?.en?.solution}
        previewData={previewData}
      />
    );
  }, [quillStringForPreview, previewData]);

  useEffect(() => {
    async function fetchPaginatedMCQs() {
      setLoading(true);
      try {
        const res = await API_QUESTIONS().get(`/mcq/all`, {
          params: {
            page: 1,
          },
        });
        setQuestions(res.data.data);
        setTotalDocs(res.data.totalDocs);
        setLoading(false);
      } catch (err) {
        console.log(err);
        setLoading(false);
      }
    }
    if (currentUser) {
      fetchPaginatedMCQs();
    }
  }, [currentUser]);

  const navigate = useNavigate();

  async function onChangePageOrPageSize(page: number, pageSize: number) {
    setLoading(true);
    try {
      const res = await API_QUESTIONS().get(`/mcq/all`, {
        params: {
          page,
          size: pageSize || 10,
          search: globalSearch, // I Wrote this line
        },
      });
      console.log({ data: res.data });
      setQuestions(res.data.data);
      setTotalDocs(res.data.totalDocs);
      setLoading(false);
    } catch (err) {
      console.log(err);
      setLoading(false);
    }
  }

  // async function fetchData() {
  //   setLoading(true);
  //   const res = await API_QUESTIONS().get("/mcq/all", {
  //     params: {
  //       search: globalSearch,
  //       page:1,
  //     },
  //   });
  //   setQuestions(res.data.data);
  //   console.log("TESTING", { data: res.data });
  //   return res;
  // }
  useEffect(() => {
    async function debounceGlobalSearch() {
      console.log("HEY I AM GETTING CALLED");
      clearTimeout(timeoutNumber);
      setTimeoutNumber(setTimeout(onChangePageOrPageSize, 600));
    }
    debounceGlobalSearch();
  }, [globalSearch]);

  const typeOptions = [
    { label: "Single", value: "single" },
    { label: "Multiple", value: "multiple" },
    { label: "Integer", value: "integer" },
    { label: "Paragraph", value: "paragraph" },
    { label: "Matrix", value: "matrix" },
  ];

  const difficultyOptions = [
    { label: "Easy", value: "easy" },
    { label: "Medium", value: "medium" },
    { label: "Hard", value: "hard" },
  ];

  function handleChangeType(values: string[]) {}
  function handleChangeDifficulty(values: string[]) {}
  function handleChangeSubjects(_: any, options: any[]) {
    setFilterSubjects(options);
  }
  function handleChangeChapters(_: any, options: any) {
    setFilterChapters(options);
  }
  function handleChangeTopics(values: string[]) {
    setFilterTopics(values);
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
          value === "easy" ? "green" : value === "medium" ? "yellow" : "red"
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
    console.log({ previewData });
  });

  useEffect(() => {
    function getSelectedChapterTopics(): any[] {
      let topics = new Set();
      filterChapters?.forEach((chapter: any) => {
        if (chapter.topics) topics.add([...chapter.topics]);
      });
      return [...topics]
        .filter((topic: any) => topic?.length)
        .map((topic: any) => ({
          label: topic,
          value: topic,
        }));
    }
    if (filterChapters?.length) setTopicOptions(getSelectedChapterTopics());
    else setTopicOptions([]);
  }, [filterChapters]);

  return (
    <MainLayout name="Questions" onClickDrawerIcon={() => setSideBarOpen(true)}>
      <Card classes={[styles.container]}>
        {isReadPermitted ? (
          <>
            {isCreatePermitted && (
              <>
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
                    <div>
                      <IconButton onClick={handlePrint}>
                        <PrintIcon />
                      </IconButton>

                      <IconButton>
                        <CSVLink filename={"Questions.csv"} data={questions}>
                          <img
                            src={sheetIcon}
                            width="21px"
                            alt="Sheet"
                            height="21px"
                          />
                        </CSVLink>
                      </IconButton>
                    </div>
                    <Button
                      onClick={() => navigate("/questions/new")}
                      icon={<AddIcon />}
                    >
                      Add New
                    </Button>
                  </div>
                  {/* <InputField
                    ref={globalSearchRef}
                    id="globalSearch"
                    label=""
                    placeholder="Search Question"
                    value={globalSearch}
                    onChange={(e: any) => setGlobalSearch(e.target.value)}
                    type="text"
                  /> */}

                  <div className={styles.filters}>
                    <Select
                      mode="multiple"
                      allowClear
                      placeholder="Type"
                      onChange={handleChangeType}
                      options={typeOptions}
                      maxTagCount="responsive"
                      showArrow
                      style={{
                        minWidth: 180,
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
                      maxTagCount="responsive"
                      showArrow
                      style={{
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
                        minWidth: 180,
                      }}
                    />
                    <Select
                      mode="multiple"
                      allowClear
                      placeholder="Topic(s)"
                      onChange={setFilterTopics}
                      options={topicOptions}
                      maxTagCount="responsive"
                      showArrow
                      style={{
                        minWidth: 180,
                      }}
                    />
                  </div>
                </div>
              </>
            )}
            <Divider style={{ margin: "1rem 0" }} />

            <div className={styles.tableContainer}>
              <QuestionsTable
                loading={loading}
                dataSource={questions?.map((question: any) => ({
                  ...question,
                  key: question.id || question._id,
                }))}
                cols={[
                  {
                    title: "View",
                    key: "view",
                    width: 70,
                    fixed: "left",
                    render: (text: any, record: any) => (
                      <IconButton
                        onClick={() => {
                          // setPreviewModalVisible(true);
                          setPreviewData(record);
                          setSideBarOpen(true);
                        }}
                      >
                        <Visibility />
                      </IconButton>
                    ),
                  },
                  ...QUESTION_COLS_ALL,
                ]}
                height="60vh"
                pagination={{
                  total: totalDocs,
                  onChange: onChangePageOrPageSize,
                  onShowSizeChange: onChangePageOrPageSize,
                }}
              />
            </div>
            {/* <hr /> */}
            {/* <section className={styles.main}>
                {getQuestionFromType(type, setData)}
              </section> */}
            {/* <div>
                <Button onClick={handleSubmitQuestion}>Submit</Button>
              </div> */}
            <Sidebar
              title="Preview"
              open={sidebarOpen}
              handleClose={() => {
                setSideBarOpen(false);
                setPreviewData({});
              }}
              width={"40%"}
              extra={
                <IconButton
                  onClick={() =>
                    navigate(`/questions/edit/${previewData?.id}`, {
                      state: { type: previewData?.type },
                    })
                  }
                >
                  <Edit />
                </IconButton>
              }
            >
              {sidebarContent}
            </Sidebar>
            <PreviewHTMLModal
              showFooter={true}
              isOpen={previewModalVisible}
              handleClose={() => setPreviewModalVisible(false)}
              quillString={quillStringForPreview}
              previewData={previewData}
              setQuestions={setQuestions}
              setPreviewData={setPreviewData}
            />
            {/* <div
            ref={tableRef}
            style={
              PrintContainerStyles as DetailedHTMLProps<
                HTMLAttributes<HTMLDivElement>,
                HTMLDivElement
              >
            }
          >
        </div> */}
            {/* <PrintTest
              subject="Physics"
              chapter="Ray Optics"
              title="Daily Rapid Test #025"
              questions={questions}
            /> */}
          </>
        ) : (
          <Error />
        )}
      </Card>
    </MainLayout>
  );
};

export default Questions;

interface IToggleProofReadPayload {
  id: string;
  isProofRead: boolean;
  type: string;
}

export const PreviewFullQuestion: React.FC<{
  quillStringQuestion: string;
  quillStringSolution: string;
  previewData: any;
  setQuestions: (currQues: any) => void;
  setPreviewData: (obj: any) => void;
  handleClose: () => void;
  disableFooter?: boolean;
}> = ({
  quillStringQuestion,
  quillStringSolution,
  previewData,
  setQuestions,
  setPreviewData,
  handleClose,
  disableFooter,
}) => {
  const handleToggleProofread = async (checked: any) => {
    console.log(checked);
    let obj = { ...previewData, isProofRead: checked };
    let payload: IToggleProofReadPayload = {
      id: previewData.id,
      isProofRead: checked,
      type: previewData.type,
    };
    try {
      const res = await API_QUESTIONS().patch(`/toggleproofread`, {
        data: payload,
      });
      if (res?.data?.status === "success") {
        console.log(res);
        setQuestions((currQues: any) => {
          let arr = currQues.map((el: any) => {
            return el.id !== previewData.id ? el : obj;
          });
          console.log(arr);
          return arr;
        });
        setPreviewData(obj);
      }
    } catch (err) {
      console.log(err);
    }
  };
  const handleDeleteQuestion = async () => {
    const type = previewData.type;
    let url;
    switch (type) {
      case "single":
      case "multiple":
        url = "/mcq/delete";
        break;
      case "integer":
        url = "/numerical/delete";
        break;
      default:
        console.log(type);
    }
    if (url) {
      try {
        const res = await API_QUESTIONS().delete(url, {
          data: {
            id: previewData.id,
          },
        });
        console.log(res);
        handleClose();
        message.success("Deleted successfully!");
        setQuestions((currQues: any) => {
          let arr = currQues.filter((el: any) => {
            return el.id !== previewData.id;
          });
          console.log(arr);
          return arr;
        });
      } catch (err) {
        console.log(err);
      }
    }
  };
  return (
    <>
      <div className={styles.previewBreadCumb}>
        <div className={styles.previewBreadCumbDiv}>
          <h4>{previewData?.subject}</h4>
          {" > "}
          <h4>
            {previewData?.chapters?.map((value: any) => value.name)?.join(", ")}
          </h4>
          {" > "}
          <h4>
            {previewData.topics
              ? previewData?.topics?.map((topic: any) => topic.name).join(", ")
              : previewData?.chapters &&
                getTopics(previewData?.chapters)?.join(", ")}
          </h4>
        </div>
        <div>
          <Tag
            color={
              previewData?.difficulty?.toLowerCase() === "easy"
                ? "green"
                : previewData?.difficulty?.toLowerCase() === "medium"
                ? "yellow"
                : "red"
            }
          >
            {previewData?.difficulty}
          </Tag>
        </div>
      </div>
      <br />
      <RenderWithLatex quillString={quillStringQuestion} />
      <Divider />
      <RenderWithLatex quillString={quillStringSolution} />
      {!disableFooter && (
        <div className={styles.footer}>
          <div className={styles.toggleButton}>
            Proof Read
            <ToggleButton
              checked={previewData?.isProofRead}
              stopPropagation
              onChange={(checked: any) => handleToggleProofread(checked)}
            />
          </div>
          <CustomPopConfirm
            title="Are you sure?"
            okText="Delete"
            cancelText="No"
            onConfirm={handleDeleteQuestion}
          >
            <IconButton>
              <DeleteOutline />
            </IconButton>
          </CustomPopConfirm>
        </div>
      )}
    </>
  );
};
const PrintTest: React.FC<{
  subject: string;
  chapter: string;
  title: string;
  questions: any[];
}> = ({ subject, chapter, title, questions }) => {
  const [pages, setPages] = useState([
    {
      count: 0,
      questions: [],
    },
  ]);

  useEffect(() => {
    if (questions?.length) {
    }
  }, [questions]);

  return (
    <>
      {pages.map((page) => (
        <section
          style={
            PrintStyles as DetailedHTMLProps<
              HTMLAttributes<HTMLDivElement>,
              HTMLDivElement
            >
          }
        >
          <div
            style={
              PrintHeaderStyles as DetailedHTMLProps<
                HTMLAttributes<HTMLDivElement>,
                HTMLDivElement
              >
            }
          >
            <div
              style={
                PrintHeaderUpperStyles as DetailedHTMLProps<
                  HTMLAttributes<HTMLDivElement>,
                  HTMLDivElement
                >
              }
            >
              <p
                style={
                  PrintHeaderUpperParaStyles as DetailedHTMLProps<
                    HTMLAttributes<HTMLDivElement>,
                    HTMLDivElement
                  >
                }
              >
                {subject}
              </p>
              <p
                style={
                  PrintHeaderUpperParaStyles as DetailedHTMLProps<
                    HTMLAttributes<HTMLDivElement>,
                    HTMLDivElement
                  >
                }
              >
                IOY
              </p>
              <p
                style={
                  PrintHeaderUpperParaStyles as DetailedHTMLProps<
                    HTMLAttributes<HTMLDivElement>,
                    HTMLDivElement
                  >
                }
              >
                {chapter}
              </p>
            </div>
            <div
              style={
                PrintHeaderLowerStyles as DetailedHTMLProps<
                  HTMLAttributes<HTMLDivElement>,
                  HTMLDivElement
                >
              }
            >
              <h2
                style={
                  PrintHeaderLowerH2Styles as DetailedHTMLProps<
                    HTMLAttributes<HTMLDivElement>,
                    HTMLDivElement
                  >
                }
              >
                {title}
              </h2>
              <p
                style={
                  PrintHeaderLowerParaStyles as DetailedHTMLProps<
                    HTMLAttributes<HTMLDivElement>,
                    HTMLDivElement
                  >
                }
              >
                Date: {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
          <div
            style={
              PrintQuestionsContentStyles as DetailedHTMLProps<
                HTMLAttributes<HTMLDivElement>,
                HTMLDivElement
              >
            }
          >
            <div
              style={
                PrintQuestionsContainerStyles as DetailedHTMLProps<
                  HTMLAttributes<HTMLDivElement>,
                  HTMLDivElement
                >
              }
            >
              <QuestionsComp questions={[...questions, ...questions]} />
              <QuestionsComp questions={[...questions, ...questions]} />
            </div>
          </div>

          <div
            style={
              PrintQuestionsFooterStyles as DetailedHTMLProps<
                HTMLAttributes<HTMLDivElement>,
                HTMLDivElement
              >
            }
          >
            <img src={logo} alt="logo" />
          </div>
        </section>
      ))}
    </>
  );
};

const QuestionsComp: React.FC<{ questions: any[] }> = ({ questions }) => {
  return (
    <div className={styles.questions}>
      {questions.map((question: any, i: number) => (
        <div
          key={question.id}
          style={
            PrintQuestionsQuestionStyles as DetailedHTMLProps<
              HTMLAttributes<HTMLDivElement>,
              HTMLDivElement
            >
          }
        >
          <span style={{ fontWeight: 400 }}>{i + 1}.</span>
          <div
            style={{
              marginLeft: "1rem",
            }}
          >
            <RenderWithLatex quillString={question?.en?.question} />
            <Grid
              container
              style={
                PrintQuestionsOptionsStyles as DetailedHTMLProps<
                  HTMLAttributes<HTMLDivElement>,
                  HTMLDivElement
                >
              }
            >
              {question.en.options.map((option: any, j: number) => (
                <Grid key={j} item md={6} xs={6} lg={6} xl={6}>
                  <div
                    style={
                      PrintQuestionsOptionStyles as DetailedHTMLProps<
                        HTMLAttributes<HTMLDivElement>,
                        HTMLDivElement
                      >
                    }
                  >
                    <span>{String.fromCharCode(97 + j)})</span>
                    <RenderWithLatex quillString={option?.value} />
                  </div>
                </Grid>
              ))}
            </Grid>
          </div>
        </div>
      ))}
    </div>
  );
};

// function getQuestionFromType(type: string, setData: (data: any) => void) {
//   switch (type) {
//     case "objective":
//       return <Objective setData={setData} />;
//     case "integer":
//       return <Integer setData={setData} />;
//     case "paragraph":
//       return <Paragraph setData={setData} />;
//     case "matrix":
//       return <MatrixMatch setData={setData} />;
//   }
// }

function getCorrectAnswers(options: any) {
  return options
    .filter((option: any) => option.isCorrectAnswer)
    .map((option: any) => option.id);
}

const flexRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const PrintContainerStyles = {
  background: "white",
  zIndex: -1,
  pointerEvents: "none",
  border: "1px solid grey",
  // width: 240mm;
  overflowY: "auto",

  // height: 297mm;
  ...flexRow,
};

const PrintStyles = {
  position: "relative",
  // height: 100%,
  width: "100%",
  margin: "0 auto",
  padding: "3rem",
};

const PrintHeaderStyles = {
  position: "absolute",
  top: "0",
  left: "0",
  width: "100%",
  height: "150px",
};

const PrintHeaderUpperStyles = {
  ...flexRow,
  background: "rgb(75, 75, 75)",
};

const PrintHeaderUpperParaStyles = {
  color: "black",
  background: "white",
  padding: "0.5rem 2rem",
  fontSize: "1.2rem",
  margin: 0,
};

const PrintHeaderLowerStyles = {
  ...flexRow,
  marginTop: "1rem",
  background: "rgba(0, 0, 0, 0.1)",
  padding: "1rem",
  borderBottom: "2px solid black",
  position: "relative",
};

const PrintHeaderLowerParaStyles = {
  position: "absolute",
  top: 0,
  right: 0,
  background: "white",
  padding: "0.5rem 2rem",
  fontSize: "1.2rem",
  fontWeight: 600,
};

const PrintHeaderLowerH2Styles = {
  textAlign: "center",
  width: "100%",
  fontWeight: 600,
  color: "black",
};

const PrintQuestionsContainerStyles = {
  ...flexRow,
  "> div:nth-child(1)": {
    borderRight: "1px solid black",
    paddingRight: "1rem",
  },
  "> div:nth-child(2)": {
    paddingLeft: "1rem",
  },
};

const PrintQuestionsContentStyles = {
  height: "calc(270mm - 150px - 100px)",
  marginTop: "150px",
  marginBottom: "100px",
};

const PrintQuestionsQuestionStyles = {
  display: "flex",
  justifyContent: "flex-start",
  alignItems: "flex-start",
};

const PrintQuestionsOptionsStyles = {
  width: "100%",
};

const PrintQuestionsOptionStyles = {
  display: "flex",
  justifyContent: "flex-start",
  alignItems: "flex-start",
};

const PrintQuestionsFooterStyles = {
  position: "absolute",
  bottom: 0,
  height: "100px",
  width: "100%",
  ...flexRow,
  borderTop: "2px solid black",
  textAlign: "center",
  background: "white",
};
