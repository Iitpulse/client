import styles from "./CreateTest.module.scss";
import { Button, CreatableSelect, InputField, Sidebar } from "../../components";
import { useContext, useEffect, useState } from "react";
import {
  ITest,
  IPattern,
  ISection,
  ISubSection,
  ITestQuestionObjective,
} from "../../utils/interfaces";
import { QUESTION_COLS_ALL, SAMPLE_TEST } from "../../utils/constants";
import { StyledMUITextField } from "../Users/components";
// import {
//   DateRangePicker,
//   DateRange,
// } from "@mui/x-date-pickers-pro/DateRangePicker";
import { AdapterDayjs } from "@mui/x-date-pickers-pro/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers-pro";
import { Dayjs } from "dayjs";
import { IconButton, TextField } from "@mui/material";
import { Box } from "@mui/system";
import {
  CustomAccordion,
  CustomAccordionDetails,
  CustomAccordionSummary,
} from "../Pattern/components/CustomAccordion";
import MUISimpleAutocomplete from "./components/MUISimpleAutocomplete";
import InsertQuestionModal from "./components/InsertQuestionModal";
import { AuthContext } from "../../utils/auth/AuthContext";
import RenderWithLatex from "../../components/RenderWithLatex/RenderWithLatex";
import { API_QUESTIONS, API_TESTS, API_USERS } from "../../utils/api";
import CustomTable from "../../components/CustomTable/CustomTable";
import { Visibility } from "@mui/icons-material";
import { PreviewHTMLModal } from "../Questions/components";
import { message } from "antd";
import { TestContext } from "../../utils/contexts/TestContext";
import CustomDateRangePicker from "../../components/CusotmDateRangePicker/CustomDateaRangePicker";
import moment from "moment";

const CreateTest = () => {
  const [test, setTest] = useState<ITest>(SAMPLE_TEST);
  const { id, name, description, exam, status, validity, sections } = test;
  const [pattern, setPattern] = useState<IPattern | null>(null);
  const [patternOptions, setPatternOptions] = useState([]);

  const [batchesOptions, setBatchesOptions] = useState([]);
  const [batches, setBatches] = useState([]);
  const [publishType, setPublishType] = useState({
    value: "immediately",
    name: "Immediately",
  });
  const [testDateRange, setTestDateRange] = useState([]);
  const [daysAfter, setDaysAfter] = useState(1);

  const { currentUser } = useContext(AuthContext);
  const { exams } = useContext(TestContext);

  useEffect(() => {
    async function fetchBatch() {
      const res = await API_USERS().get(`/batch/get`);
      console.log({ res });
      setBatchesOptions(res?.data);
    }

    if (currentUser?.id) {
      fetchBatch();
    }
  }, [currentUser]);

  const examOptions = [
    {
      id: "JEE_MAINS",
      name: "JEE MAINS",
      value: "JEE_MAINS",
    },
    {
      id: "JEE_ADVANCED",
      name: "JEE ADVANCED",
      value: "JEE_ADVANCED",
    },
    {
      id: "NEETUG",
      name: "NEET",
      value: "NEETUG",
    },
  ];

  const statusOptions = [
    {
      name: "Ongoing",
      value: "ongoing",
    },
    {
      name: "Active",
      value: "active",
    },
    {
      name: "Inactive",
      value: "inactive",
    },
  ];

  function onChangeInput(e: any) {
    setTest((prev) => ({ ...prev, [e.target.id]: e.target.value }));
  }

  // function handleChangeValidity(newValue: any) {
  //   setTest({ ...test, validity: { from: newValue[0], to: newValue[1] } });
  // }

  useEffect(() => {
    if (pattern?.sections) {
      setTest((prev) => ({ ...prev, sections: pattern.sections }));
    }
  }, [pattern]);

  useEffect(() => {
    let fetchData = async (examName: string) => {
      let response = await API_TESTS().get(`/pattern/pattern/exam`, {
        params: {
          exam: examName,
        },
      });
      console.log({ response });
      setPatternOptions(response.data);
    };
    if (test.exam?.name) {
      fetchData(test.exam.name);
    } else {
      setPatternOptions([]);
    }
  }, [test]);

  async function handleClickSubmit() {
    if (currentUser) {
      try {
        let finalTest = {
          ...test,
          createdBy: {
            id: currentUser.id,
            userType: currentUser.userType,
          },
          validity: {
            from: moment(testDateRange[0]).toISOString(),
            to: moment(testDateRange[1]).toISOString(),
          },
          result: {
            publishProps: {
              type: publishType.value,
              publishDate: getPublishDate(
                publishType.value,
                daysAfter,
                testDateRange
              ),
              isPublished: false,
            },
          },
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString(),
          durationInMinutes: pattern?.durationInMinutes,
        };
        console.log({ finalTest });
        if (finalTest) return;
        let response = await API_TESTS().post(`/test/create`, finalTest);
        message.success("Test Created Successfully");
        console.log({ response });
      } catch (error: any) {
        message.error("Error: " + error?.response?.data?.message);
      }
      // const id = ``
    }
  }

  // function handleAddQuestion(
  //   sectionId: string,
  //   subSectionId: string,
  //   question: any
  // ) {
  //   let newTest = { ...test };
  //   newTest.sections.forEach((section: ISection) => {
  //     if (section.id === sectionId) {
  //       section.subSections.forEach((subSection: ISubSection) => {
  //         if (subSection.id === subSectionId) {
  //           subSection.questions[question.id] = question;
  //         }
  //       });
  //     }
  //   });
  //   setTest(newTest);
  // }

  function handleUpdateSection(sectionId: string, data: any) {
    setTest((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => {
        if (section.id === sectionId) {
          return { ...section, ...data };
        }
        return section;
      }),
    }));
  }

  return (
    <>
      <div className={styles.container}>
        <div className={styles.inputFields}>
          {/* <StyledMUITextField
            id="id"
            label="Id"
            value={id}
            variant="outlined"
            onChange={onChangeInput}
          /> */}
          <StyledMUITextField
            id="name"
            label="Name"
            value={name}
            variant="outlined"
            onChange={onChangeInput}
          />
          <StyledMUITextField
            id="description"
            label="Description"
            value={description}
            variant="outlined"
            onChange={onChangeInput}
          />
          <MUISimpleAutocomplete
            label="Exam"
            onChange={(val: any) => {
              console.log({ val });
              onChangeInput({ target: { id: "exam", value: val } });
            }}
            options={exams?.map((exam) => ({
              id: exam._id,
              name: exam.name,
              value: exam.name,
            }))}
            value={{ name: test.exam?.name, value: test.exam?.name }}
          />
          <CreatableSelect
            multiple
            onAddModalSubmit={() => {}}
            options={batchesOptions}
            setValue={setBatches}
            value={batches}
            label={"Batche(s)"}
            id="batches"
          />
          <div className={styles.dateSelector}>
            <CustomDateRangePicker
              onChange={(props: any) => setTestDateRange(props)}
              value={testDateRange}
            />
          </div>
          <MUISimpleAutocomplete
            label="Pattern"
            onChange={(val: any) => setPattern(val)}
            options={patternOptions}
            disabled={!Boolean(patternOptions.length)}
            value={{
              name: pattern?.name || "",
              value: pattern?.name || "",
            }}
          />
          <MUISimpleAutocomplete
            label="Result Publish Type"
            onChange={(val: any) => setPublishType(val)}
            options={publishTypeOptions}
            value={publishType}
          />
          {publishType.value === "autoAfterXDays" && (
            <StyledMUITextField
              id="daysAfter"
              label="Publish after - Day(s)"
              type="number"
              value={daysAfter}
              variant="outlined"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setDaysAfter(parseInt(e.target.value))
              }
              inputProps={{ min: 1 }}
            />
          )}
        </div>
        {sections && pattern && (
          <section className={styles.sections}>
            {sections.map((section) => (
              <Section
                section={section}
                key={section.id}
                handleUpdateSection={handleUpdateSection}
              />
            ))}
          </section>
        )}
        {!sections.length && (
          <p style={{ textAlign: "center" }}>
            Please select a pattern to create Test
          </p>
        )}
        <Button onClick={handleClickSubmit}>Create Test</Button>
      </div>
      <Sidebar title="Recent Activity">Recent</Sidebar>
    </>
  );
};

export default CreateTest;

const Section: React.FC<{
  section: ISection;
  handleUpdateSection: (sectionId: string, data: any) => void;
}> = ({ section, handleUpdateSection }) => {
  const { name, subject, totalQuestions, toBeAttempted, subSections } = section;

  console.log({ subject });

  function handleUpdateSubSection(subSectionId: string, data: any) {
    handleUpdateSection(section.id, {
      subSections: section.subSections.map((subSection) => {
        if (subSection.id === subSectionId) {
          return { ...subSection, ...data };
        }
        return subSection;
      }),
    });
  }

  return (
    <CustomAccordion className={styles.section}>
      <CustomAccordionSummary>{name}</CustomAccordionSummary>
      <CustomAccordionDetails>
        <div className={styles.header}>
          <div>
            <span>Name</span>
            <p>{name}</p>
          </div>
          <div>
            <span>Subject</span>
            <p>{subject}</p>
          </div>
          <div>
            <span>Total Questions</span>
            <p>{totalQuestions}</p>
          </div>
          <div>
            <span>To Be Attempted</span>
            <p>{toBeAttempted}</p>
          </div>
        </div>
        <div className={styles.subSections}>
          {subSections?.map((subSection: ISubSection) => (
            <SubSection
              key={subSection.id}
              subSection={subSection}
              handleUpdateSubSection={handleUpdateSubSection}
              subject={subject}
            />
          ))}
        </div>
      </CustomAccordionDetails>
    </CustomAccordion>
  );
};

const SubSection: React.FC<{
  subSection: ISubSection;
  handleUpdateSubSection: (subSectionId: string, data: any) => void;
  subject: string;
}> = ({ subSection, handleUpdateSubSection, subject }) => {
  const [questionModal, setQuestionModal] = useState<boolean>(false);
  const [tempQuestions, setTempQuestions] = useState<any>({});
  // const [questions, setQuestions] = useState([]);
  console.log({ subSection });
  const { name, description, totalQuestions, toBeAttempted, type, questions } =
    subSection;
  const [easy, setEasy] = useState("0");
  const [medium, setMedium] = useState("0");
  const [hard, setHard] = useState("0");
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [previewData, setPreviewData] = useState<any>({} as any);
  const [quillStringForPreview, setQuillStringForPreview] = useState<any>("");

  useEffect(() => {
    if (previewData?.type === "single" || previewData?.type === "multiple") {
      setQuillStringForPreview(
        previewData?.en?.question +
          previewData?.en?.options.map((op: any) => op.value).join("<br>")
      );
    }
  }, [previewData]);

  useEffect(() => {
    console.log({ questions });
    if (questions) {
      setTempQuestions(questions);
    }
  }, [questions]);

  async function generateQuestions() {
    const { data } = await API_QUESTIONS().get(`/mcq/autogenerate`, {
      params: {
        type,
        difficulties: {
          easy: parseInt(easy),
          medium: parseInt(medium),
          hard: parseInt(hard),
        },
        subject,
        totalQuestions: subSection.totalQuestions,
      },
    });
    console.table(data);
    setTempQuestions(data);
    handleUpdateSubSection(subSection.id, { questions: data });
  }

  function handleClickAutoGenerate() {
    generateQuestions();
    // setTempQuestions(newQuestions);
  }

  function handleClickSave(rows: Array<any>) {
    console.log({ rows });
    handleUpdateSubSection(subSection.id, { questions: rows });
    setQuestionModal(false);
  }

  return (
    <div className={styles.subSection}>
      <div className={styles.header}>
        <div>
          <span>Name</span>
          <p>{name}</p>
        </div>
        <div>
          <span>Total Questions</span>
          <p>{totalQuestions}</p>
        </div>
        <div>
          <span>To Be Attempted</span>
          <p>{toBeAttempted}</p>
        </div>
        <div>
          <span>Type</span>
          <p>{type}</p>
        </div>
      </div>
      <div className={styles.questions}>
        <div className={styles.searchHeader}>
          {/* <MUISimpleAutocomplete
            label="Search Question"
            onChange={() => {}}
            options={[]}
          /> */}
          <div
            className={styles.addQuestion}
            onClick={() => setQuestionModal(true)}
          >
            + Add Question
          </div>
          <Button onClick={handleClickAutoGenerate}>Auto Generate</Button>
        </div>
        <div className={styles.inputSection}>
          <InputField
            id="amt-easy"
            type="number"
            label="Easy"
            required={true}
            value={easy}
            onChange={(e) => {
              setEasy(e.target.value);
            }}
          />
          <InputField
            id="amt-medium"
            type="number"
            label="Medium"
            required={true}
            value={medium}
            onChange={(e) => {
              setMedium(e.target.value);
            }}
          />
          <InputField
            id="amt-hard"
            type="number"
            label="Hard"
            required={true}
            value={hard}
            onChange={(e) => {
              setHard(e.target.value);
            }}
          />
        </div>
        <div className={styles.questionsList}>
          <CustomTable
            columns={
              [
                ...QUESTION_COLS_ALL,
                {
                  title: "Preview",
                  key: "preview",
                  width: 120,
                  fixed: "right",
                  render: (text: any, record: any) => (
                    <IconButton
                      onClick={() => {
                        setPreviewModalVisible(true);
                        setPreviewData(record);
                      }}
                    >
                      <Visibility />
                    </IconButton>
                  ),
                },
              ] as Array<any>
            }
            dataSource={Object.values(tempQuestions)?.map((q: any) => ({
              ...q,
              key: q._id,
            }))}
            selectable={false}
          />
          {/* {tempQuestions &&
            Object.values(tempQuestions)?.map((question: any) => (
              <Question key={question.id} {...question} />
            ))} */}
        </div>
      </div>
      <InsertQuestionModal
        open={questionModal}
        onClose={() => setQuestionModal(false)}
        // questions={questions ? Object.values(questions) : []}
        totalQuestions={totalQuestions ?? 0}
        // setQuestions={(qs: any) =>
        //   handleUpdateSubSection(subSection.id, { questions: qs })
        // }
        type="Single"
        subject={subject}
        handleClickSave={handleClickSave}
      />
      <PreviewHTMLModal
        showFooter={false}
        previewData={previewData}
        isOpen={previewModalVisible}
        handleClose={() => setPreviewModalVisible(false)}
        quillString={quillStringForPreview}
        setQuestions={setTempQuestions}
        setPreviewData={setPreviewData}
      />
    </div>
  );
};

const Question: React.FC<ITestQuestionObjective> = ({ en }) => {
  return (
    <div className={styles.questionContainer}>
      <RenderWithLatex quillString={en?.question} />
    </div>
  );
};

const publishTypeOptions = [
  {
    name: "Immediately",
    value: "immediately",
  },
  {
    name: "At the end of test",
    value: "atTheEndOfTest",
  },
  {
    name: "Automatic after 'x' days",
    value: "autoAfterXDays",
  },
  {
    name: "Manual",
    value: "manual",
  },
];

function getPublishDate(
  publishType: string,
  daysAfter: number | null | undefined,
  testDateRange: Array<any>
): string | null {
  switch (publishType) {
    case "immediately":
      return null;
    case "atTheEndOfTest":
      return moment(testDateRange[1]).toISOString();
    case "autoAfterXDays":
      return moment().add(daysAfter, "days").toISOString();
    case "manual":
      return null;
    default:
      return null;
  }
}
