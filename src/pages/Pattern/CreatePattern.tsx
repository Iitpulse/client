import React, {
  HTMLInputTypeAttribute,
  useContext,
  useEffect,
  useState,
} from "react";
import styles from "./Pattern.module.scss";
import {
  Sidebar,
  NotificationCard,
  MUISimpleAutocomplete,
} from "../../components";
import { StyledMUITextField } from "../Users/components";
import { IPattern, ISection, ISubSection } from "../../utils/interfaces";
import clsx from "clsx";
import { IconButton, Skeleton, Tooltip } from "@mui/material";
import deleteIcon from "../../assets/icons/delete.svg";
import closeCircleIcon from "../../assets/icons/close-circle.svg";
import {
  CustomAccordion,
  CustomAccordionDetails,
  CustomAccordionSummary,
} from "./components/CustomAccordion";
import tickCircle from "../../assets/icons/tick-circle.svg";
import { AuthContext } from "../../utils/auth/AuthContext";
import axios from "axios";
import { usePermission } from "../../utils/contexts/PermissionsContext";
import { PERMISSIONS } from "../../utils/constants";
import { Error } from "../";
import { message } from "antd";
import { API_QUESTIONS, API_TESTS } from "../../utils/api";
import { TestContext } from "../../utils/contexts/TestContext";
import { useParams } from "react-router";
import { hasPatternPemissions } from "./utils";
import AddIcon from "@mui/icons-material/Add";
import MainLayout from "../../layouts/MainLayout";
import duplicateIcon from "../../assets/icons/duplicate.svg";
const sampleSection = {
  id: "", // PT_SE_PHY123
  name: "",
  exam: "",
  subject: "",
  subSections: [], // Nesting toBeAttempted
  totalQuestions: 1,
  toBeAttempted: 1,
};

const sampleSubSection = {
  id: "", // PT_SS_MCQ123
  name: "",
  description: "", // (optional) this will be used as a placeholder for describing the subsection and will be replaced by the actual description later on
  type: "",
  totalQuestions: 1,
  toBeAttempted: 1,
};

const CreatePattern = () => {
  const isReadPermitted = usePermission(PERMISSIONS.PATTERN.READ);
  const isCreatePermitted = usePermission(PERMISSIONS.PATTERN.CREATE);
  const isUpdatePermitted = usePermission(PERMISSIONS.PATTERN.UPDATE);
  const [currentPattern, setCurrentPattern] = useState({} as IPattern);
  const [loading, setLoading] = useState<boolean>(false);
  // const isDeletePermitted = usePermission(PERMISSIONS.PATTERN.DELETE);

  // Get patternId from router
  const { patternId } = useParams();

  const { currentUser } = useContext(AuthContext);
  const { exams, subjects } = useContext(TestContext);
  // const [subjects, setSubjects] = useState([]);

  const [name, setName] = useState("");
  const [exam, setExam] = useState("");
  const [durationInMinutes, setDurationInMinutes] = useState("");

  useEffect(() => {
    async function fetchPattern() {
      setLoading(true);
      try {
        const res = await API_TESTS().get(`/pattern/single`, {
          params: {
            id: patternId,
          },
        });
        setCurrentPattern(res.data);
      } catch (error) {
        console.log("FETCH_PATTERN_ERROR", error);
      }
      setLoading(false);
    }
    if (patternId) {
      fetchPattern();
    }
  }, [patternId]);

  useEffect(() => {
    if (currentPattern?.name) {
      setName(currentPattern.name);
      setExam(currentPattern.exam);
      setDurationInMinutes(String(currentPattern.durationInMinutes));
      setSections(currentPattern.sections);
    }
  }, [currentPattern]);

  const [sections, setSections] = useState<Array<ISection>>([]);

  function handleChangeSection(id: string, data: any) {
    setSections(
      sections.map((section) =>
        section.id === id ? { ...section, ...data } : section
      )
    );
  }

  function handleClickAddNew() {
    setSections([
      ...sections,
      {
        ...sampleSection,
        id: `${Math.random() * 100}`,
        exam: exam,
        subject: "physics",
      },
    ]);
  }
  function handleDuplicateSection(id: string) {
    const section = sections.find((data) => data.id === id);
    if (!section) return;
    setSections([...sections, { ...section, id: `${Math.random() * 100}` }]);
    message.success("Duplicated successfully..");
  }
  function handleDeleteSection(id: string) {
    setSections(sections.filter((section) => section.id !== id));
    message.success("Deleted successfully..");
  }

  async function handleClickSubmit() {
    try {
      if (currentUser) {
        const pattern: IPattern = {
          id: `${currentUser.instituteId}_${name
            .replace(/ /g, "")
            .toUpperCase()}`,
          name,
          exam: exam,
          durationInMinutes: parseInt(durationInMinutes),
          sections: sections.map((sec) => ({
            ...sec,
            exam: exam,
          })),
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString(),
          createdBy: {
            userType: currentUser.userType || "",
            id: currentUser.id || "",
          },
          usedIn: [],
        };
        console.log({ pattern });
        //check if url contains new or edit
        if (patternId) {
          await API_TESTS().patch(`/pattern/update`, pattern, {
            params: { id: patternId },
          });
          message.success("Pattern updated successfully");
        } else {
          await API_TESTS().post(`/pattern/create`, pattern);
          message.success("Pattern created successfully");
        }
        // const res = await API_TESTS().post(`/pattern/create`, pattern);
        // message.success("Pattern created successfully");
        // console.log({ res });
      }
    } catch (error) {
      message.error("Error creating pattern");
    }
  }

  return (
    <MainLayout name="Create Pattern">
      {hasPatternPemissions(
        {
          isReadPermitted,
          isCreatePermitted,
          isUpdatePermitted,
        },
        patternId
      ) ? (
        loading ? (
          <>
            <Skeleton variant="rectangular" width={"100%"} height={100} />
            <Skeleton variant="rectangular" width={"100%"} height={100} />
          </>
        ) : (
          <>
            <section className={styles.container}>
              <div className={styles.header}>
                <StyledMUITextField
                  value={name}
                  label="Name"
                  onChange={(e: any) => setName(e.target.value)}
                />
                <StyledMUITextField
                  value={durationInMinutes}
                  label="Duration (in Minutes)"
                  onChange={(e: any) => setDurationInMinutes(e.target.value)}
                />
                <MUISimpleAutocomplete
                  label="Exam"
                  onChange={setExam}
                  options={
                    exams?.map((exam) => ({
                      name: exam.name,
                      value: exam.name,
                      id: exam._id,
                    })) || []
                  }
                  value={exam}
                />
              </div>
              <div className={styles.sections}>
                {sections.map((section, i) => (
                  <Section
                    key={i}
                    handleDuplicateSection={handleDuplicateSection}
                    section={section}
                    setSection={handleChangeSection}
                    handleDeleteSection={handleDeleteSection}
                    index={i}
                    subjects={subjects}
                  />
                ))}
              </div>
              <div className={styles.addSection} onClick={handleClickAddNew}>
                <p>+ Add New Section</p>
              </div>
              <Tooltip title="Save Pattern" placement="top">
                <IconButton
                  className={styles.savePatternBtn}
                  onClick={handleClickSubmit}
                >
                  <img src={tickCircle} alt="save-pattern" />
                </IconButton>
              </Tooltip>
            </section>
            {/* <Sidebar title="Recent Activity">
            {Array(10)
              .fill(0)
              .map((_, i) => (
                <NotificationCard
                  key={i}
                  id="aasdadsd"
                  status={i % 2 === 0 ? "success" : "warning"}
                  title={"New Student Joined-" + i}
                  description="New student join IIT Pulse Anurag Pal - Dropper Batch"
                  createdAt="10 Jan, 2022"
                />
              ))}
          </Sidebar> */}
          </>
        )
      ) : (
        <Error />
      )}
    </MainLayout>
  );
};

export default CreatePattern;

const Section: React.FC<{
  section: ISection;
  setSection: (id: string, data: any) => void;
  handleDeleteSection: (id: string) => void;
  handleDuplicateSection: (id: string) => void;
  index: number;
  subjects: Array<any>;
}> = ({
  section,
  setSection,
  handleDeleteSection,
  index,
  subjects,
  handleDuplicateSection,
}) => {
  function handleChangeSubSection(id: string, data: any) {
    setSection(section.id, {
      ...section,
      subSections: section.subSections.map((subSection) =>
        subSection.id === id ? { ...subSection, ...data } : subSection
      ),
    });
  }

  function handleClickAddNewSubSection() {
    setSection(section.id, {
      ...section,
      subSections: [
        ...section.subSections,
        { ...sampleSubSection, id: `${Math.random() * 100}`, type: "single" },
      ],
    });
  }

  function handleDeleteSubSection(id: string) {
    setSection(section.id, {
      ...section,
      subSections: section.subSections.filter(
        (subSection) => subSection.id !== id
      ),
    });
  }

  // const subjects = [
  //   { value: "physics", label: "Physics" },
  //   { value: "chemistry", label: "Chemistry" },
  //   { value: "maths", label: "Maths" },
  //   { value: "Biology", label: "Biology" },
  // ];

  return (
    <CustomAccordion className={styles.section} defaultExpanded>
      <CustomAccordionSummary>
        <div className={styles.accordionHeader}>
          <div>{section.name || `Section ${index + 1}`}</div>
          <div>
            <Tooltip title="Duplicate Section" placement="top">
              <IconButton
                onClick={(e: any) => {
                  e.stopPropagation();
                  handleDuplicateSection(section.id);
                }}
              >
                <img src={duplicateIcon} alt="Duplicate Section" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete Section" placement="top">
              <IconButton
                onClick={(e: any) => {
                  e.stopPropagation();
                  handleDeleteSection(section.id);
                }}
              >
                <img src={deleteIcon} alt="Delete Section" />
              </IconButton>
            </Tooltip>
          </div>
        </div>
      </CustomAccordionSummary>
      <CustomAccordionDetails>
        <div className={styles.sectionHeader}>
          <CustomInputSection
            value={section.name}
            label="Name"
            onChange={(e: any) =>
              setSection(section.id, { name: e.target.value })
            }
          />
          <CustomSelect
            id="sction-subject"
            value={section.subject}
            label="Subject"
            onChange={(e: any) => {
              setSection(section.id, { subject: e.target.value });
            }}
            options={subjects?.map((subject) => ({
              label: subject.name,
              value: subject.name,
            }))}
          />
          <CustomInputSection
            value={section.totalQuestions}
            label="Total Questions"
            type="number"
            inputProps={{ min: 1 }}
            onChange={(e: any) =>
              setSection(section.id, {
                totalQuestions: parseInt(e.target.value),
              })
            }
          />
          <CustomInputSection
            value={section.toBeAttempted}
            label="Questions To be Attempted"
            type="number"
            inputProps={{ min: 1 }}
            onChange={(e: any) =>
              setSection(section.id, {
                toBeAttempted: parseInt(e.target.value),
              })
            }
          />
        </div>
        {section.subSections.map((subSection, i) => (
          <SubSection
            key={i}
            subSection={subSection}
            setSubSection={handleChangeSubSection}
            handleDeleteSubSection={handleDeleteSubSection}
            index={i}
          />
        ))}
        <div
          className={clsx(styles.addSection, styles.addSubSection)}
          onClick={handleClickAddNewSubSection}
        >
          <p>+ Add New Sub-Section</p>
        </div>
      </CustomAccordionDetails>
    </CustomAccordion>
  );
};

const SubSection: React.FC<{
  subSection: ISubSection;
  setSubSection: (id: string, data: any) => void;
  handleDeleteSubSection: (id: string) => void;
  index: number;
}> = ({ subSection, setSubSection, handleDeleteSubSection, index }) => {
  const subSectionTypes = [
    {
      label: "Single",
      value: "single",
    },
    {
      label: "Multiple",
      value: "multiple",
    },
    {
      label: "Integer",
      value: "integer",
    },
    {
      label: "Paragraph",
      value: "paragraph",
    },
    {
      label: "Matrix",
      value: "matrix",
    },
  ];

  return (
    <div className={styles.subSection}>
      <div className={styles.actionHeader}>
        <p>{subSection.name || `SubSection ${index + 1}`}</p>
        <IconButton onClick={() => handleDeleteSubSection(subSection.id)}>
          <img src={closeCircleIcon} alt="Delete Sub-Section" />
        </IconButton>
      </div>
      <div className={styles.subSectionHeader}>
        <CustomInputSection
          value={subSection.name}
          label="Name"
          onChange={(e: any) =>
            setSubSection(subSection.id, { name: e.target.value })
          }
        />
        <CustomInputSection
          value={subSection.description}
          label="Description"
          onChange={(e: any) =>
            setSubSection(subSection.id, { description: e.target.value })
          }
        />
        <CustomSelect
          id="subsection-type"
          value={subSection.type}
          label="Subsection Type"
          onChange={(e: any) => {
            setSubSection(subSection.id, { type: e.target.value });
          }}
          options={subSectionTypes}
        />
        <CustomInputSection
          value={subSection.totalQuestions}
          label="Total Questions"
          type="number"
          inputProps={{ min: 1 }}
          onChange={(e: any) =>
            setSubSection(subSection.id, {
              totalQuestions: parseInt(e.target.value),
            })
          }
        />
        <CustomInputSection
          value={subSection.toBeAttempted}
          label="Questions To be Attempted"
          type="number"
          inputProps={{ min: 1 }}
          onChange={(e: any) =>
            setSubSection(subSection.id, {
              toBeAttempted: parseInt(e.target.value),
            })
          }
        />
        <MarkingScheme
          type={subSection.type}
          subSectionId={subSection.id}
          setSubSection={setSubSection}
        />
      </div>
    </div>
  );
};

interface IInputProps {
  type?: HTMLInputTypeAttribute;
  value: any;
  onChange: (e: any) => void;
  label?: string;
  placehodler?: string;
  inputProps?: any;
  id?: string;
}

const CustomInputSection: React.FC<IInputProps> = ({
  type,
  id,
  label,
  placehodler,
  value,
  onChange,
  inputProps,
}) => {
  return (
    <div className={styles.customInput}>
      <label htmlFor={id}>{label}</label>
      <input
        title={label}
        onChange={onChange}
        type={type}
        value={value}
        id={id}
        placeholder={placehodler}
        {...inputProps}
      />
    </div>
  );
};

interface ICustomSelectProps {
  id: string;
  label: string;
  value: string;
  onChange: (e: any) => void;
  options: Array<{
    value: string;
    label: string;
  }>;
  inputProps?: any;
}

const CustomSelect: React.FC<ICustomSelectProps> = ({
  id,
  label,
  value,
  onChange,
  options,
  inputProps,
}) => {
  return (
    <div className={styles.customInput}>
      <label htmlFor={id}>{label}</label>
      <select value={value} title={label} onChange={onChange}>
        {options.map((option) => (
          <option key={option.label} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};
interface IMarkingSchemeProps {
  subSectionId: string;
  type: string;
  setSubSection: (id: string, data: any) => void;
}

const MarkingScheme: React.FC<IMarkingSchemeProps> = ({
  subSectionId,
  type,
  setSubSection,
}) => {
  const [markingSchemeCorrect, setMarkingSchemeCorrect] = useState<
    Array<number>
  >([1]);
  const [markingSchemeIncorrect, setMarkingSchemeIncorrect] =
    useState<number>(0);
  const handleAddCorrectInput = () => {
    setMarkingSchemeCorrect((data: Array<number>) => [...data, 1]);
  };
  return (
    <>
      <CustomInputSection
        value={markingSchemeIncorrect}
        label="Incorrect Marks"
        type="number"
        inputProps={{ max: 0 }}
        onChange={(e: any) => {
          setSubSection(subSectionId, {
            markingScheme: {
              incorrect: parseInt(e.target.value),
              correct: markingSchemeCorrect,
            },
          });
          setMarkingSchemeIncorrect(parseInt(e.target.value));
        }}
      />
      {markingSchemeCorrect.map((correctMark: number, idx: number) => {
        return (
          <CustomInputSection
            value={correctMark}
            label={`Correct Marks ${idx + 1}`}
            type="number"
            inputProps={{ min: 1 }}
            onChange={(e: any) => {
              let correct = [...markingSchemeCorrect];
              correct[idx] = parseInt(e.target.value);
              console.log(correct);
              setSubSection(subSectionId, {
                markingScheme: {
                  correct,
                  incorrect: markingSchemeIncorrect,
                },
              });
              setMarkingSchemeCorrect(correct);
            }}
          />
        );
      })}
      {type !== "single" && (
        <IconButton
          style={{
            marginTop: "20px",
          }}
          onClick={handleAddCorrectInput}
        >
          <AddIcon />
        </IconButton>
      )}
    </>
  );
};
