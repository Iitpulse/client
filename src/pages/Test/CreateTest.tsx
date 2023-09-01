import styles from "./CreateTest.module.scss";
import { InputField } from "../../components";
import { useContext, useEffect, useState } from "react";
import { IPattern, ITestQuestionObjective } from "../../utils/interfaces";
import {
  QUESTION_COLS_ALL,
  SAMPLE_TEST,
  TEST_GENERAL,
} from "../../utils/constants";
import { IconButton } from "@mui/material";
import InsertQuestionModal from "./components/InsertQuestionModal";
import { AuthContext } from "../../utils/auth/AuthContext";
import RenderWithLatex from "../../components/RenderWithLatex/RenderWithLatex";
import { API_QUESTIONS, API_TESTS, API_USERS } from "../../utils/api/config";
import CustomTable from "../../components/CustomTable/CustomTable";
import { Delete, Visibility } from "@mui/icons-material";
import { PreviewHTMLModal } from "../Questions/components";
import {
  Button,
  Collapse,
  Form,
  Input,
  InputNumber,
  message,
  Popconfirm,
  Select,
} from "antd";
import { useTestContext } from "../../utils/contexts/TestContext";
import CustomDateRangePicker from "../../components/CustomDateRangePicker/CustomDateRangePicker";
import MainLayout from "../../layouts/MainLayout";
import { getPublishDate, isTestFormFilled } from "./utils/functions";
import {
  TSectionSchema,
  TSubSectionSchema,
  TTestSchema,
  TestFormSchemaType,
} from "./utils/types";
import { useLocation, useParams } from "react-router";
import { MessageType } from "antd/es/message/interface";
import dayjs from "dayjs";
import { ThunderboltOutlined } from "@ant-design/icons";
import { AllQuestionsTable } from "../Questions/Questions";

const statusOptions = [
  {
    name: "Ongoing",
    value: "Ongoing",
  },
  {
    name: "Active",
    value: "Active",
  },
  {
    name: "Inactive",
    value: "Inactive",
  },
];

const defaultState: any = {
  nam: "",
  desc: "",
  batches: "",
  date: "",
  status: "",
  pattern: {
    id: "",
    name: "",
  },
};

const CreateTest = () => {
  const [test, setTest] = useState<TTestSchema>(SAMPLE_TEST);
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

  const [testDateRange, setTestDateRange] = useState<Array<any>>([]);
  const [daysAfter, setDaysAfter] = useState(1);

  const { currentUser, userExists } = useContext(AuthContext);
  const { exams, fetchTestByID } = useTestContext();
  const { pathname } = useLocation();
  const { testId } = useParams();

  const [helperTexts, setHelperTexts] = useState<any>(defaultState);

  useEffect(() => {
    setEditMode(pathname?.includes("edit"));
  }, [pathname]);

  // console.log({ pattern, sections });

  useEffect(() => {
    async function fetchFullTest() {
      try {
        const res = await fetchTestByID(testId as string);
        const { data } = res;
        console.log({ data });
        const {
          name,
          description,
          exam,
          validity,
          sections,
          batches,
          publishType,
          daysAfter,
          pattern,
          ...rest
        } = data;
        setTest((prev) => ({
          ...prev,
          name,
          description,
          exam,
          validity,
          sections,
          batches: batches?.map((batch: any) => ({
            ...batch,
            value: batch.name,
          })),
          publishType,
          daysAfter,
          pattern,
          ...rest,
        }));
        console.log({ batches });
        if (validity?.from && validity?.to) {
          setTestDateRange([dayjs(validity?.from), dayjs(validity?.to)]);
        }
        if (publishType?.value) {
          setPublishType(publishType);
        }
        // if (status) {
        //   let statusObj = statusOptions.find(
        //     (item) => item.value?.toLowerCase() === status?.toLowerCase()
        //   );
        //   if (statusObj) {
        //     setStatus(statusObj);
        //   }
        // }
        if (daysAfter) {
          setDaysAfter(daysAfter);
        }
        if (batches?.length) {
          setBatches(batches);
        }
        console.log({ pattern, patternOptions });
        if (pattern) {
          let patternObj = patternOptions.find((pt) => pt?._id === pattern.id);
          console.log({ patternObj });
          if (patternObj?.name) {
            // TODO: Resolve TS Issue, should not be any
            setPattern(patternObj);
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
  }, [editMode, testId, patternOptions]);

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
      setTest((prev: any) => ({ ...prev, sections: pattern.sections }));
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
    test.sections.forEach((section) => {
      section.subSections.forEach((subSection) => {
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

  function getStatus(testDateRange: any) {
    if (testDateRange[0] && testDateRange[1]) {
      if (dayjs().isBefore(testDateRange[0])) {
        return "Inactive";
      }
      if (dayjs().isAfter(testDateRange[1])) {
        return "Expired";
      }
      return "Ongoing";
    }
    return "Inactive";
  }
  async function handleClickSubmit() {
    const creatingTest = message.loading(
      `${editMode ? "Updating" : "Creating"} Test...`,
      0
    );
    if (!userExists()) {
      creatingTest();
      return message.error("Please login to continue");
    }

    // console.log({ testDateRange });

    let finalTest: TTestSchema = {
      ...test,
      exam: {
        id: test.exam.id,
        name: test.exam.name,
      },
      createdBy: {
        id: currentUser?.id as string,
        userType: currentUser?.userType as string,
      },
      validity: {
        from: testDateRange[0] ? dayjs(testDateRange[0]).toISOString() : "",
        to: testDateRange[1] ? dayjs(testDateRange[1]).toISOString() : "",
      },
      result: {
        maxMarks: null,
        averageMarks: null,
        averageCompletionTime: null,
        publishProps: {
          type: publishType.value,
          publishDate: getPublishDate(
            publishType.value,
            daysAfter,
            testDateRange
          ),
          isPublished: false,
        },
        students: [],
      },
      pattern: {
        name: pattern?.name ?? "",
        id: pattern?._id ?? "",
      },
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      durationInMinutes: editMode
        ? test.durationInMinutes
        : (pattern?.durationInMinutes as number),
      batches: test.batches.map((batch) => ({
        id: batch.id,
        name: batch.name,
      })),
      status: getStatus(testDateRange),
    };
    let hasUnfilledQues = false;
    let messageText = "";
    finalTest.sections.forEach((section) => {
      return section.subSections.forEach((subSection) => {
        if (subSection?.questions?.length != subSection?.totalQuestions) {
          hasUnfilledQues = true;
          messageText = `Please fill all the questions in ${subSection.name}`;
        }
      });
    });
    if (hasUnfilledQues) {
      creatingTest();
      return message.error(messageText);
    }
    if (editMode) {
      finalTest.createdAt = test.createdAt;
    }
    console.log({ finalTest, editMode });
    if (
      !isTestFormFilled(setHelperTexts, defaultState, finalTest) ||
      !allQuestionsFilled()
    ) {
      creatingTest();
      console.log({ helperTexts });
      return message.error("Please fill all the fields");
    }
    try {
      if (editMode) {
        updateTest(finalTest, creatingTest);
        return;
      }
      let finalPayLoad = {
        ...finalTest,
        batches: finalTest.batches.map((batch) => ({
          ...batch,
          _id: batch.id,
        })),
      };
      console.log({ finalPayLoad });
      let response = await API_TESTS().post(`/test/create`, finalPayLoad);
      creatingTest();
      message.success("Test Created Successfully");
    } catch (error: any) {
      creatingTest();
      message.error("Error: " + error?.response?.data?.message);
    }
    // const id = ``
  }

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

  function getInputStatus(field: string | string[]) {
    if (Array.isArray(field)) {
      for (let i = 0; i < field.length; i++) {
        if (helperTexts[field[i]]) {
          return "error";
        }
      }
      return "validating";
    }
    if (helperTexts[field]) {
      return "error";
    }
    return "validating";
  }

  return (
    <MainLayout
      name="Create Test"
      menuActions={
        <div className={styles.submitBtn}>
          <Button onClick={handleClickSubmit} type="primary">
            {editMode ? "Update Test" : "Create Test"}
          </Button>
        </div>
      }
    >
      <div className={styles.container}>
        <div className={styles.inputFields}>
          <Form layout="vertical" className={styles.form}>
            <Form.Item
              label="Name"
              help={helperTexts.name}
              validateStatus={getInputStatus("name")}
            >
              <Input
                id="name"
                onChange={onChangeInput}
                value={test.name}
                placeholder="Title for test"
              />
            </Form.Item>
            <Form.Item
              label="Description"
              help={helperTexts.desc}
              validateStatus={getInputStatus("desc")}
            >
              <Input
                id="description"
                placeholder="Small description for test"
                onChange={onChangeInput}
                value={test.description}
              />
            </Form.Item>
            <Form.Item
              label="Exam"
              help={helperTexts?.["exam.name"] || helperTexts?.["exam.id"]}
              validateStatus={getInputStatus(["exam.name", "exam.id"])}
            >
              <Select
                allowClear
                placeholder="Select Exam"
                onChange={(val, option) => {
                  console.log({ val, option });
                  onChangeInput({ target: { id: "exam", value: option } });
                }}
                options={exams?.map((exam) => ({
                  ...exam,
                  id: exam._id,
                  name: exam.name,
                  value: exam.name,
                }))}
                disabled={editMode}
                showSearch
                value={test.exam?.name || null}
                maxTagCount="responsive"
                showArrow
              />
            </Form.Item>
            <Form.Item
              label="Batches"
              help={helperTexts.batches}
              validateStatus={getInputStatus("batches")}
            >
              <Select
                mode="multiple"
                allowClear
                placeholder="Select Batches"
                onChange={(vals, options) => {
                  console.log({ vals, options });
                  onChangeInput({ target: { id: "batches", value: options } });
                }}
                options={batchesOptions?.map((batch: any) => ({
                  id: batch._id,
                  name: batch.name,
                  value: batch.name,
                }))}
                value={test.batches}
                maxTagCount="responsive"
                showArrow
              />
            </Form.Item>
            <Form.Item
              label="Validity"
              help={
                helperTexts?.["validity.from"] || helperTexts?.["validity.to"]
              }
              validateStatus={getInputStatus(["validity.from", "validity.to"])}
            >
              <CustomDateRangePicker
                showTime={true}
                onChange={(props: any) => setTestDateRange(props)}
                value={testDateRange}
                disablePrevDates={true}
              />
            </Form.Item>
            {/* <Form.Item
              label="Status"
              help={helperTexts.status}
              validateStatus={getInputStatus("status")}
            >
              <Select
                placeholder="Select Status"
                showSearch
                onChange={(val) => {
                  console.log({ val });
                  onChangeInput({ target: { id: "status", value: val } });
                }}
                options={statusOptions}
                value={test.status || null}
              />
            </Form.Item> */}
            <Form.Item
              label="Pattern"
              help={
                helperTexts?.["pattern.id"] || helperTexts?.["pattern.name"]
              }
              validateStatus={getInputStatus(["pattern.id", "pattern.name"])}
            >
              <Select
                showSearch
                placeholder="Select Pattern"
                onChange={(_, val) => {
                  console.log({ val });
                  const option = val as { id: string; name: string };
                  setPattern(
                    patternOptions?.find((pt) => pt.name === option.name) ||
                      null
                  );
                  setTest((prev: any) => ({
                    ...prev,
                    sections:
                      patternOptions?.find((pt) => pt.name === option.name)
                        ?.sections || [],
                  }));
                }}
                disabled={!Boolean(patternOptions.length) || editMode}
                options={patternOptions?.map((pt) => ({
                  id: pt._id,
                  name: pt.name,
                  value: pt.name,
                }))}
                value={pattern?.name}
              />
            </Form.Item>
            <Form.Item label="Result Publish Type">
              <Select
                showSearch
                options={publishTypeOptions}
                onChange={(val, option) => {
                  const op = option as { name: string; value: string };
                  setTest((prev) => ({
                    ...prev,
                    result: {
                      ...prev.result,
                      publishProps: {
                        ...prev.result?.publishProps,
                        type: val,
                      },
                    },
                  }));
                  setPublishType({ value: val, name: op.name });
                }}
                value={test.result?.publishProps?.type || null}
              />
            </Form.Item>
            {publishType.value === "autoAfterXDays" && (
              <Form.Item label="Publish after - Day(s)">
                <InputNumber
                  id="daysAfter"
                  value={daysAfter}
                  onChange={(val) => setDaysAfter(val as number)}
                  min={1}
                />
              </Form.Item>
            )}
          </Form>
        </div>
        {sections && (editMode || pattern) && (
          <section className={styles.sections}>
            {/* {sections.map((section) => ( */}
            <Sections
              sections={sections}
              handleUpdateSection={handleUpdateSection}
            />
            {/* ))} */}
          </section>
        )}
        {!sections.length && (
          <p style={{ textAlign: "center" }}>
            Please select a pattern to create Test
          </p>
        )}
      </div>
      {/* <Sidebar title="Recent Activity">Recent</Sidebar> */}
    </MainLayout>
  );
};

export default CreateTest;

const Sections: React.FC<{
  sections: TSectionSchema[];
  handleUpdateSection: (sectionId: string, data: any) => void;
}> = ({ sections, handleUpdateSection }) => {
  const [accordionItems, setAccordionItems] = useState<
    Array<{
      label: string;
      key: string;
      children: React.ReactNode;
    }>
  >([]);

  function handleUpdateSubSection(section: TSectionSchema) {
    return (subSectionId: string, data: any) =>
      handleUpdateSection(section.id, {
        subSections: section.subSections.map((subSection) => {
          if (subSection.id === subSectionId) {
            return { ...subSection, ...data };
          }
          return subSection;
        }),
      });
  }

  const HeaderEl: React.FC<{
    name: string;
    subject: string;
    totalQuestions: number | null;
    toBeAttempted: number | null;
  }> = ({ name, subject, totalQuestions, toBeAttempted }) => (
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
  );

  useEffect(() => {
    setAccordionItems(
      sections?.map((section, i) => ({
        label: section.name,
        key: i.toString(),
        children: (
          <>
            <HeaderEl
              name={section.name}
              toBeAttempted={section.toBeAttempted}
              totalQuestions={section.totalQuestions}
              subject={section.subject}
            />
            <div className={styles.subSections}>
              {section?.subSections?.map((subSection) => (
                <SubSection
                  key={subSection.id}
                  subSection={subSection}
                  handleUpdateSubSection={handleUpdateSubSection(section)}
                  subject={section.subject}
                />
              ))}
            </div>
          </>
        ),
      }))
    );
  }, [sections]);

  return <Collapse items={accordionItems} />;
};

const SubSection: React.FC<{
  subSection: TSubSectionSchema;
  handleUpdateSubSection: (subSectionId: string, data: any) => void;
  subject: string;
}> = ({ subSection, handleUpdateSubSection, subject }) => {
  const [questionModal, setQuestionModal] = useState<boolean>(false);
  const [tempQuestions, setTempQuestions] = useState<any>([{}]);
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
    // setLoading(true);
    let areErrors = false;
    try {
      const rejectedQuestions = JSON.parse(
        localStorage.getItem(TEST_GENERAL.REJECTED_QUESTIONS) || "[]"
      );
      let res: any = null;
      if (type === "single" || type === "multiple") {
        //Repeat the part below where it is applicable for a certain type
        if (
          parseInt(easy) + parseInt(medium) + parseInt(hard) !==
          parseInt(totalQuestions?.toString() || "0")
        ) {
          areErrors = true;
          message.error(
            "Total Questions should be equal to sum of easy, medium and hard"
          );
        }
        if (areErrors) {
          return;
        }
        setLoading(true);
        //Till here
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
        //Repeat the part below where it is applicable for a certain type
        if (
          parseInt(easy) + parseInt(medium) + parseInt(hard) !==
          parseInt(totalQuestions?.toString() || "0")
        ) {
          areErrors = true;
          message.error(
            "Total Questions should be equal to sum of easy, medium and hard"
          );
        }
        if (areErrors) {
          return;
        }
        setLoading(true);
        //Till here
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

  function getMaxAllowedCount(type: "easy" | "medium" | "hard") {
    if (!totalQuestions) return 0;
    if (type === "easy") {
      return totalQuestions - parseInt(medium) - parseInt(hard);
    } else if (type === "medium") {
      return totalQuestions - parseInt(easy) - parseInt(hard);
    } else if (type === "hard") {
      return totalQuestions - parseInt(easy) - parseInt(medium);
    }
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
          <Button
            className={styles.addQuestion}
            onClick={() => setQuestionModal(true)}
            type="dashed"
          >
            + Click to Add Question
          </Button>
          <Button
            onClick={() => handleClickAutoGenerate(type)}
            type="primary"
            icon={<ThunderboltOutlined />}
          >
            Auto Generate
          </Button>
        </div>
        <Form layout="vertical" className={styles.inputSection}>
          <Form.Item label="Easy" required>
            <InputNumber
              className={styles.inputNumber}
              min={"0"}
              max={getMaxAllowedCount("easy")?.toString()}
              id="amt-easy"
              value={easy}
              onChange={(val) => {
                setEasy(val ?? "");
              }}
            />
          </Form.Item>
          <Form.Item label="Medium" required>
            <InputNumber
              className={styles.inputNumber}
              min={"0"}
              max={getMaxAllowedCount("medium")?.toString()}
              id="amt-medium"
              required={true}
              value={medium}
              onChange={(val) => {
                setMedium(val ?? "");
              }}
            />
          </Form.Item>
          <Form.Item label="Hard" required>
            <InputNumber
              className={styles.inputNumber}
              min={"0"}
              max={getMaxAllowedCount("hard")?.toString()}
              id="amt-hard"
              required={true}
              value={hard}
              onChange={(val) => {
                setHard(val ?? "");
              }}
            />
          </Form.Item>
        </Form>
        <div className={styles.questionsList}>
          <AllQuestionsTable
            questions={tempQuestions}
            noEdit={true}
            loading={loading}
            handleDeleteQuestion={(e) => {
              console.log({ e });
              setTempQuestions((prev: any) => {
                return Object.values(prev).filter((q: any) => q._id !== e._id);
              });
            }}
          />
          {/* <CustomTable
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
                        // handleClickAutoGenerate(null, record._id);
                        setTempQuestions((prev: any) => {
                          return Object.values(prev).filter(
                            (q: any) => q._id !== record._id
                          );
                        });
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
      <div className={styles.questions2}>
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
      </div>
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
