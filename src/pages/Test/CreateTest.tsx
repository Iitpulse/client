import styles from "./CreateTest.module.scss";
import { Button, Sidebar } from "../../components";
import { useEffect, useState } from "react";
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

const CreateTest = () => {
  const [test, setTest] = useState<ITest>(SAMPLE_TEST);
  const { id, name, description, exam, status, validity, sections } = test;
  const [pattern, setPattern] = useState<IPattern | null>(null);
  const [questionModal, setQuestionModal] = useState<boolean>(true);

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

  return (
    <>
      <div className={styles.container}>
        <div className={styles.inputFields}>
          <StyledMUITextField
            id="id"
            label="Id"
            value={id}
            variant="outlined"
            onChange={onChangeInput}
          />
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
          <StyledMUITextField
            id="exam"
            label="Exam"
            value={exam.fullName}
            variant="outlined"
            onChange={onChangeInput}
          />
          <StyledMUITextField
            id="status"
            label="Status"
            value={status}
            variant="outlined"
            onChange={onChangeInput}
          />

          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DateRangePicker
              startText="Valid From"
              endText="Valid Till"
              value={[validity.from, validity.to]}
              onChange={handleChangeValidity}
              renderInput={(startProps, endProps) => (
                <>
                  <TextField {...startProps} style={{ minWidth: 200 }} />
                  <Box sx={{ mx: 2 }}> to </Box>
                  <TextField {...endProps} style={{ minWidth: 200 }} />
                </>
              )}
            />
          </LocalizationProvider>
          <MUISimpleAutocomplete
            label="Pattern"
            onChange={() => {}}
            options={[]}
          />
        </div>
        {sections && (
          <section className={styles.sections}>
            {sections.map((section) => (
              <Section {...section} key={section.id} />
            ))}
          </section>
        )}
      </div>
      <InsertQuestionModal
        open={questionModal}
        onClose={() => setQuestionModal(false)}
        questions={[]}
        setQuestions={(a: any) => {}}
        type="Single"
        subject="Physics"
      />
      <Sidebar title="Recent Activity">Recent</Sidebar>
    </>
  );
};

export default CreateTest;

const Section: React.FC<ISection> = ({
  name,
  subject,
  totalQuestions,
  toBeAttempted,
  subSections,
}) => {
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
            <SubSection {...subSection} />
          ))}
        </div>
      </CustomAccordionDetails>
    </CustomAccordion>
  );
};

const SubSection: React.FC<ISubSection> = ({
  name,
  description,
  totalQuestions,
  toBeAttempted,
  type,
  questions,
}) => {
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
          <MUISimpleAutocomplete
            label="Search Question"
            onChange={() => {}}
            options={[]}
          />
          <Button>Auto Generate</Button>
        </div>
        <div className={styles.questionsList}>
          {Object.values(questions).map((question: any) => (
            <Question {...question} />
          ))}
        </div>
      </div>
    </div>
  );
};

const Question: React.FC<ITestQuestionObjective> = ({ question }) => {
  return (
    <div className={styles.questionContainer}>
      <div
        dangerouslySetInnerHTML={{ __html: question }}
        className={styles.question}
      ></div>
    </div>
  );
};
