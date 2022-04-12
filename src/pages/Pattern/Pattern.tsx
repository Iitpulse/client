import React, { HTMLInputTypeAttribute, useContext, useState } from "react";
import styles from "./Pattern.module.scss";
import {
  Sidebar,
  NotificationCard,
  MUISimpleAutocomplete,
} from "../../components";
import { StyledMUITextField } from "../Users/components";
import { IPattern, ISection, ISubSection } from "../../utils/interfaces";
import clsx from "clsx";
import { IconButton, Tooltip } from "@mui/material";
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

const Pattern = () => {
  const isReadPermitted = usePermission(PERMISSIONS.PATTERN.READ);
  // const isCreatePermitted = usePermission(PERMISSIONS.PATTERN.CREATE);
  // const isUpdatePermitted = usePermission(PERMISSIONS.PATTERN.UPDATE);
  // const isDeletePermitted = usePermission(PERMISSIONS.PATTERN.DELETE);

  const { currentUser } = useContext(AuthContext);

  const [name, setName] = useState("");
  const [exam, setExam] = useState("");

  const examOptions = [
    {
      id: "JEE MAINS",
      name: "JEE Mains",
      value: "JEE MAINS",
    },
    {
      id: "JEE ADVANCED",
      name: "JEE Advanced",
      value: "JEE ADVANCED",
    },
    {
      id: "NEETUG",
      name: "NEET",
      value: "NEETUG",
    },
  ];

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

  function handleDeleteSection(id: string) {
    setSections(sections.filter((section) => section.id !== id));
  }

  async function handleClickSubmit() {
    if (currentUser) {
      const pattern: IPattern = {
        id: `${currentUser.instituteId}_${name
          .replace(/ /g, "")
          .toUpperCase()}`,
        name,
        exam: exam,
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
      const res = await axios.post(
        "http://localhost:5002/pattern/create",
        pattern
      );
      console.log({ res });
    }
  }

  return (
    <>
      {isReadPermitted ? (
        <>
          <section className={styles.container}>
            <div className={styles.header}>
              <StyledMUITextField
                value={name}
                label="Name"
                onChange={(e: any) => setName(e.target.value)}
              />
              <MUISimpleAutocomplete
                label="Exam"
                onChange={setExam}
                options={examOptions}
                value={exam}
              />
            </div>
            <div className={styles.sections}>
              {sections.map((section, i) => (
                <Section
                  key={i}
                  section={section}
                  setSection={handleChangeSection}
                  handleDeleteSection={handleDeleteSection}
                  index={i}
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
          <Sidebar title="Recent Activity">
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
          </Sidebar>
        </>
      ) : (
        <Error />
      )}
    </>
  );
};

export default Pattern;

const Section: React.FC<{
  section: ISection;
  setSection: (id: string, data: any) => void;
  handleDeleteSection: (id: string) => void;
  index: number;
}> = ({ section, setSection, handleDeleteSection, index }) => {
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

  const subjects = [
    { value: "physics", label: "Physics" },
    { value: "chemistry", label: "Chemistry" },
    { value: "maths", label: "Maths" },
    { value: "Biology", label: "Biology" },
  ];

  return (
    <CustomAccordion className={styles.section} defaultExpanded>
      <CustomAccordionSummary>
        <div className={styles.accordionHeader}>
          <div>{section.name || `Section ${index + 1}`}</div>
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
            options={subjects}
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
