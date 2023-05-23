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
import {
  QUESTION_COLS_ALL,
  SAMPLE_TEST,
  TEST_GENERAL,
} from "../../utils/constants";
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
import { API_QUESTIONS, API_TESTS, API_USERS } from "../../utils/api/config";
import CustomTable from "../../components/CustomTable/CustomTable";
import { Delete, Visibility } from "@mui/icons-material";
import { PreviewHTMLModal } from "../Questions/components";
import { message, Popconfirm } from "antd";
import { TestContext, useTestContext } from "../../utils/contexts/TestContext";
import CustomDateRangePicker from "../../components/CusotmDateRangePicker/CustomDateaRangePicker";
import moment from "moment";
import MainLayout from "../../layouts/MainLayout";
import { ZodError, z } from "zod";
import { getPublishDate, isTestFormFilled } from "./utils/functions";
import { TestFormSchemaType } from "./utils/types";
import { useLocation, useParams } from "react-router";
import { MessageType } from "antd/es/message/interface";

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

const defaultState: any = {
  nam: "",
  desc: "",
  exam: "",
  batches: "",
  date: "",
  status: "",
  pattern: "",
};

const CreateTest = () => {
  const [test, setTest] = useState<ITest>(SAMPLE_TEST);
  const { id, name, description, exam, validity, sections } = test;
  const [pattern, setPattern] = useState<IPattern | null>(null);
  const [patternOptions, setPatternOptions] = useState<Array<IPattern>>([]);
  const [editMode, setEditMode] = useState(false);

  const [batchesOptions, setBatchesOptions] = useState([]);
  const [batches, setBatches] = useState([]);
  const [publishType, setPublishType] = useState({
    value: "immediately",
    name: "Immediately",
  });
  const [status, setStatus] = useState({
    value: "",
    name: "",
  });
  const [testDateRange, setTestDateRange] = useState<Array<any>>([]);
  const [daysAfter, setDaysAfter] = useState(1);

  const { currentUser } = useContext(AuthContext);
  const { exams, fetchTestByID } = useTestContext();
  const { pathname } = useLocation();
  const { testId } = useParams();

  const [helperTexts, setHelperTexts] = useState<any>(defaultState);

  useEffect(() => {
    setEditMode(pathname?.includes("edit"));
  }, [pathname]);

  useEffect(() => {
    async function fetchFullTest() {
      try {
        const res = await fetchTestByID(testId as string);
        const { data } = res;
        const {
          name,
          description,
          exam,
          validity,
          sections,
          batches,
          publishType,
          status,
          daysAfter,
          patternId,
          ...rest
        } = data;
        setTest((prev) => ({
          ...prev,
          name,
          description,
          exam,
          validity,
          sections,
          batches,
          publishType,
          status,
          daysAfter,
          patternId,
          ...rest,
        }));
        if (validity?.from && validity?.to) {
          setTestDateRange([moment(validity?.from), moment(validity?.to)]);
        }
        if (publishType?.value) {
          setPublishType(publishType);
        }
        if (status) {
          let statusObj = statusOptions.find(
            (item) => item.value?.toLowerCase() === status?.toLowerCase()
          );
          if (statusObj) {
            setStatus(statusObj);
          }
        }
        if (daysAfter) {
          setDaysAfter(daysAfter);
        }
        if (batches?.length) {
          setBatches(batches);
        }
        if (patternId) {
          let patternObj = patternOptions.find((pt) => pt.id === patternId);
          if (patternObj?.name) {
            // TODO: Resolve TS Issue, should not be any
            setPattern((prev: any) => {
              if (prev) {
                return {
                  ...prev,
                  name: patternObj?.name,
                };
              }
            });
          }
        }
        if (sections) {
        }
      } catch (error: any) {
        message.error(error?.response?.data?.message || "Something went wrong");
      }
    }
    if (editMode && testId?.length) {
      fetchFullTest();
    }
  }, [editMode, testId]);

  useEffect(() => {
    async function fetchBatch() {
      const res = await API_USERS().get(`/batch/get`);
      // console.log({ res });
      setBatchesOptions(res?.data);
    }

    if (currentUser?.id) {
      fetchBatch();
    }
  }, [currentUser]);

  function onChangeInput(e: any) {
    if (e.target.id === "name") {
      const regex = /[^a-zA-Z0-9-_ ]/g;
      if (regex.test(e.target.value)) {
        message.error("Cannot use special characters except -, _ and space");
        return;
      }
    }
    setTest((prev) => ({ ...prev, [e.target.id]: e.target.value }));
  }

  useEffect(() => {
    if (pattern?.sections && !editMode) {
      setTest((prev) => ({ ...prev, sections: pattern.sections }));
    }
  }, [pattern, editMode]);

  useEffect(() => {
    let fetchData = async (examName: string) => {
      let response = await API_TESTS().get(`/pattern/pattern/exam`, {
        params: {
          exam: examName,
        },
      });
      setPatternOptions(response.data);
    };
    if (test.exam?.name) {
      fetchData(test.exam.name);
    } else {
      setPatternOptions([]);
    }
  }, [test.exam?.name]);

  const allQuestionsFilled = () => {
    let allFilled = true;
    test.sections.forEach((section: ISection) => {
      section.subSections.forEach((subSection: ISubSection) => {
        if (!subSection?.questions) {
          allFilled = false;
        }
      });
    });
    return allFilled;
  };

  async function updateTest(finalTest: any, loading: MessageType) {
    try {
      const response = await API_TESTS().patch(`/test/update`, finalTest);
      loading();
      message.success("Test Updated Succesfully");
    } catch (error: any) {
      console.log("ERR_UPDATING_TEST", error);
      loading();
      message.error(error?.response?.data?.message);
    }
  }

  async function handleClickSubmit() {
    if (
      !isTestFormFilled(setHelperTexts, defaultState, {
        test,
        status,
        testDateRange,
        batches,
        pattern,
      }) &&
      !allQuestionsFilled()
    ) {
      return message.error("Please fill all the fields");
    }
    if (currentUser) {
      const creatingTest = message.loading("Updating Test", 0);
      try {
        let finalTest = {
          ...test,
          status: status.name,
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
          createdAt: editMode ? test.createdAt : new Date().toISOString(),
          modifiedAt: new Date().toISOString(),
          durationInMinutes: editMode
            ? test.durationInMinutes
            : pattern?.durationInMinutes,
          patternId: pattern?.id,
          batches,
        };

        if (editMode) {
          updateTest(finalTest, creatingTest);
          return;
        }
        // if (finalTest) return;
        let response = await API_TESTS().post(`/test/create`, finalTest);
        creatingTest();
        message.success("Test Created Successfully");
      } catch (error: any) {
        creatingTest();
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
    <MainLayout name="Create Test">
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
            helperText={helperTexts.nam}
            onChange={onChangeInput}
          />
          <StyledMUITextField
            id="description"
            label="Description"
            value={description}
            variant="outlined"
            helperText={helperTexts.desc}
            onChange={onChangeInput}
          />
          <MUISimpleAutocomplete
            label="Exam"
            disabled={editMode}
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
              showTime={true}
              onChange={(props: any) => setTestDateRange(props)}
              value={testDateRange}
            />
          </div>
          <MUISimpleAutocomplete
            label="Status"
            onChange={(val: any) => {
              console.log({ val });
              setStatus(val);
            }}
            options={statusOptions}
            disabled={!Boolean(statusOptions.length)}
            value={{
              name: status?.name || "",
              value: status?.value || "",
            }}
          />
          <MUISimpleAutocomplete
            label="Pattern"
            onChange={(val: any) => setPattern(val)}
            options={patternOptions?.map((pt) => ({
              name: pt.name,
              value: pt.name,
            }))}
            disabled={!Boolean(patternOptions.length) || editMode}
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
        {sections && (editMode || pattern) && (
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
        <div className={styles.submitBtn}>
          <Button onClick={handleClickSubmit}>
            {editMode ? "Update Test" : "Create Test"}
          </Button>
        </div>
      </div>
      {/* <Sidebar title="Recent Activity">Recent</Sidebar> */}
    </MainLayout>
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (totalQuestions) {
      setEasy(Math.floor(totalQuestions * 0.3).toString());
      setMedium(Math.floor(totalQuestions * 0.5).toString());
      setHard(Math.floor(totalQuestions * 0.2).toString());
    }
  }, [totalQuestions]);

  useEffect(() => {
    if (previewData?.type === "single" || previewData?.type === "multiple") {
      setQuillStringForPreview(
        previewData?.en?.question +
          previewData?.en?.options.map((op: any) => op.value).join("<br>")
      );
    }
  }, [previewData]);

  useEffect(() => {
    if (questions) {
      setTempQuestions(questions);
    }
  }, [questions]);

  useEffect(() => {
    return () => {
      // Remove Rejected Questions from Local Storage
      localStorage.removeItem(TEST_GENERAL.REJECTED_QUESTIONS);
    };
  });

  async function generateQuestions(type: string) {
    setLoading(true);
    try {
      const rejectedQuestions = JSON.parse(
        localStorage.getItem(TEST_GENERAL.REJECTED_QUESTIONS) || "[]"
      );
      let res: any = null;
      if (type === "single" || type === "multiple") {
        res = await API_QUESTIONS().get(`/mcq/autogenerate`, {
          params: {
            type,
            difficulties: {
              easy: parseInt(easy),
              medium: parseInt(medium),
              hard: parseInt(hard),
            },
            rejectedQuestions,
            subject,
            totalQuestions: subSection.totalQuestions,
          },
        });
        let data: any = res.data;

        let withAttemptedByForOptions = [...data];
        withAttemptedByForOptions.forEach((ques) => {
          ques.en.options.forEach((option: any) => {
            option["attemptedBy"] = 0;
          });

          ques.hi.options.forEach((option: any) => {
            option["attemptedBy"] = 0;
          });
        });
        setTempQuestions(withAttemptedByForOptions);
        console.log({ withAttemptedByForOptions });
        handleUpdateSubSection(subSection.id, {
          questions: withAttemptedByForOptions,
        });
      } else if (type === "integer") {
        res = await API_QUESTIONS().get(`/numerical/autogenerate`, {
          params: {
            type,
            difficulties: {
              easy: parseInt(easy),
              medium: parseInt(medium),
              hard: parseInt(hard),
            },
            rejectedQuestions,
            subject,
            totalQuestions: subSection.totalQuestions,
          },
        });
        let data: any = res.data;

        let withAttemptedByForOptions = [...data];
        // withAttemptedByForOptions.forEach((ques) => {
        //   ques.en.options.forEach((option: any) => {
        //     option["attemptedBy"] = 0;
        //   });

        //   ques.hi.options.forEach((option: any) => {
        //     option["attemptedBy"] = 0;
        //   });
        // });
        setTempQuestions(withAttemptedByForOptions);
        console.log({ withAttemptedByForOptions });
        handleUpdateSubSection(subSection.id, {
          questions: withAttemptedByForOptions,
        });
      }
    } catch (error: any) {
      console.log(error);
      message.error(error?.response?.data?.message);
    }
    setLoading(false);
  }

  function handleClickAutoGenerate(type: any, rejected?: string) {
    if (rejected) {
      const prevRejected = JSON.parse(
        localStorage.getItem(TEST_GENERAL.REJECTED_QUESTIONS) || "[]"
      );
      const newRejected = [...prevRejected, rejected];
      localStorage.setItem(
        TEST_GENERAL.REJECTED_QUESTIONS,
        JSON.stringify(newRejected)
      );
    }
    generateQuestions(type);
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
          <Button onClick={() => handleClickAutoGenerate(type)}>
            Auto Generate
          </Button>
        </div>
        <div className={styles.inputSection}>
          <InputField
            id="amt-easy"
            type="number"
            label="Easy"
            required={true}
            value={easy}
            onChange={(e: any) => {
              setEasy(e.target.value);
            }}
          />
          <InputField
            id="amt-medium"
            type="number"
            label="Medium"
            required={true}
            value={medium}
            onChange={(e: any) => {
              setMedium(e.target.value);
            }}
          />
          <InputField
            id="amt-hard"
            type="number"
            label="Hard"
            required={true}
            value={hard}
            onChange={(e: any) => {
              setHard(e.target.value);
            }}
          />
        </div>
        <div className={styles.questionsList}>
          <CustomTable
            columns={
              [
                {
                  title: "View",
                  key: "view",
                  width: 70,
                  fixed: "left",
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
                ...QUESTION_COLS_ALL,
                {
                  title: "Reject",
                  key: "reject",
                  width: 80,
                  fixed: "right",
                  render: (text: any, record: any) => (
                    <Popconfirm
                      title="Sure to reject?"
                      onConfirm={() => {
                        handleClickAutoGenerate(null, record._id);
                      }}
                    >
                      <IconButton>
                        <Delete />
                      </IconButton>
                    </Popconfirm>
                  ),
                },
              ] as Array<any>
            }
            loading={loading}
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
