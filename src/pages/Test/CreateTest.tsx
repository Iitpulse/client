import styles from "./CreateTest.module.scss";
import { Button, Sidebar } from "../../components";
import { useContext, useEffect, useState } from "react";
import {
  ITest,
  IPattern,
  ISection,
  ISubSection,
  ITestQuestionObjective,
} from "../../utils/interfaces";
import { SAMPLE_TEST } from "../../utils/constants";
import { StyledMUITextField } from "../Users/components";
import DateRangePicker from "@mui/lab/DateRangePicker";
import AdapterDateFns from "@mui/lab/AdapterDateFns";
import LocalizationProvider from "@mui/lab/LocalizationProvider";
import { TextField } from "@mui/material";
import { Box } from "@mui/system";
import {
  CustomAccordion,
  CustomAccordionDetails,
  CustomAccordionSummary,
} from "../Pattern/components/CustomAccordion";
import MUISimpleAutocomplete from "./components/MUISimpleAutocomplete";
import InsertQuestionModal from "./components/InsertQuestionModal";
import axios from "axios";
import { AuthContext } from "../../utils/auth/AuthContext";
import RenderWithLatex from "../../components/RenderWithLatex/RenderWithLatex";

const CreateTest = () => {
  const [test, setTest] = useState<ITest>(SAMPLE_TEST);
  const { id, name, description, exam, status, validity, sections } = test;
  const [pattern, setPattern] = useState<IPattern | null>(null);
  const [patternOptions, setPatternOptions] = useState([]);

  const { currentUser } = useContext(AuthContext);

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

  function handleChangeValidity(newValue: any) {
    setTest({ ...test, validity: { from: newValue[0], to: newValue[1] } });
  }

  useEffect(() => {
    if (pattern?.sections) {
      setTest((prev) => ({ ...prev, sections: pattern.sections }));
    }
  }, [pattern]);

  useEffect(() => {
    let fetchData = async (examName: string) => {
      let response = await axios.get(
        `${process.env.REACT_APP_TESTS_API}/pattern/pattern/exam`,
        {
          params: {
            exam: examName,
          },
        }
      );
      console.log({ response });
      setPatternOptions(response.data);
    };
    if (test.exam?.name) {
      fetchData(test.exam.name);
    } else {
      setPatternOptions([]);
    }
  }, [test]);

  function handleClickSubmit() {
    if (currentUser) {
      let finalTest = {
        ...test,
        createdBy: {
          id: currentUser.id,
          userType: currentUser.userType,
        },
        createdAt: new Date().toISOString(),
        modfiedAt: new Date().toISOString(),
      };
      console.log({ finalTest });
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
            options={examOptions}
            value={{ name: test.exam?.name, value: test.exam?.name }}
          />
          <MUISimpleAutocomplete
            label="Status"
            onChange={(val: any) =>
              onChangeInput({ target: { id: "status", value: val.name } })
            }
            options={statusOptions}
            value={{
              name: status,
              value: status,
            }}
          />
          <div className={styles.dateSelector}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DateRangePicker
                startText="Valid From"
                endText="Valid Till"
                value={[validity.from, validity.to]}
                onChange={handleChangeValidity}
                renderInput={(startProps: any, endProps: any) => (
                  <>
                    <TextField {...startProps} />
                    <Box sx={{ mx: 2 }}> to </Box>
                    <TextField {...endProps} />
                  </>
                )}
              />
            </LocalizationProvider>
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
}> = ({ subSection, handleUpdateSubSection }) => {
  const [questionModal, setQuestionModal] = useState<boolean>(false);
  const [tempQuestions, setTempQuestions] = useState<any>({});
  // const [questions, setQuestions] = useState([]);
  const { name, description, totalQuestions, toBeAttempted, type, questions } =
    subSection;

  useEffect(() => {
    console.log({ questions });
    if (questions) {
      setTempQuestions(questions);
    }
  }, [questions]);

  async function generateQuestions() {
    const { data } = await axios.get(
      `${process.env.REACT_APP_QUESTIONS_API}/mcq/autogenerate`,
      {
        params: {
          type,
          difficulties: ["easy"],
          totalQuestions: subSection.totalQuestions,
        },
      }
    );
    console.table(data);
    setTempQuestions(data);
  }

  function handleClickAutoGenerate() {
    const newQuestions = generateQuestions();
    setTempQuestions(newQuestions);
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
        <div className={styles.questionsList}>
          {tempQuestions &&
            Object.values(tempQuestions)?.map((question: any) => (
              <Question key={question.id} {...question} />
            ))}
        </div>
      </div>
      <InsertQuestionModal
        open={questionModal}
        onClose={() => setQuestionModal(false)}
        questions={questions ? Object.values(questions) : []}
        totalQuestions={totalQuestions ?? 0}
        setQuestions={(qs: any) =>
          handleUpdateSubSection(subSection.id, { questions: qs })
        }
        type="Single"
        subject="Physics"
        handleClickSave={handleClickSave}
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
