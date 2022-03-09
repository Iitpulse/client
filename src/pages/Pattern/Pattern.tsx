import React, { HTMLInputTypeAttribute, useState } from "react";
import styles from "./Pattern.module.scss";
import { Sidebar, NotificationCard } from "../../components";
import { StyledMUITextField } from "../Users/components";
import { ISection, ISubSection } from "../../utils/interfaces";
import clsx from "clsx";
import { IconButton, Tooltip } from "@mui/material";
import deleteIcon from "../../assets/icons/delete.svg";
import closeCircleIcon from "../../assets/icons/close-circle.svg";
import {
  CustomAccordion,
  CustomAccordionDetails,
  CustomAccordionSummary,
} from "./components/CustomAccordion";

const sampleSection = {
  id: "", // PT_SE_PHY123
  name: "",
  exam: "",
  subject: "",
  subSections: [], // Nesting toBeAttempted
  totalQuestions: 0,
  toBeAttempted: 0,
};

const sampleSubSection = {
  id: "", // PT_SS_MCQ123
  name: "",
  description: "", // (optional) this will be used as a placeholder for describing the subsection and will be replaced by the actual description later on
  type: "",
  totalQuestions: 0,
  toBeAttempted: 0,
  questions: [],
};

const Pattern = () => {
  const [name, setName] = useState("");
  const [exam, setExam] = useState("");

  const [sections, setSections] = useState<Array<ISection>>([
    { ...sampleSection, id: `${Math.random() * 100}` },
  ]);

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
      { ...sampleSection, id: `${Math.random() * 100}` },
    ]);
  }

  function handleDeleteSection(id: string) {
    setSections(sections.filter((section) => section.id !== id));
  }

  return (
    <>
      <section className={styles.container}>
        <div className={styles.header}>
          <StyledMUITextField
            value={name}
            label="Name"
            onChange={(e: any) => setName(e.target.value)}
          />
          <StyledMUITextField
            value={exam}
            label="Exam"
            onChange={(e: any) => setExam(e.target.value)}
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
        { sampleSubSection, id: `${Math.random() * 100}` },
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
          <CustomInputSection
            value={section.exam}
            label="Exam"
            onChange={(e: any) =>
              setSection(section.id, { exam: e.target.value })
            }
          />
          <select
            value={section.subject}
            title="Subject"
            className={styles.customInput}
            onChange={(e: any) =>
              setSection(section.id, { subject: e.target.value })
            }
          >
            <option value="physics">Physics</option>
            <option value="chemistry">Chemistry</option>
            <option value="maths">Maths</option>
            <option value="Biology">Biology</option>
          </select>
          <CustomInputSection
            value={section.toBeAttempted}
            label="Questions To be Attempted"
            type="number"
            inputProps={{ min: 1 }}
            onChange={(e: any) =>
              setSection(section.id, { toBeAttempted: e.target.value })
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
  return (
    <div className={styles.subSection}>
      <p>{subSection.name || `SubSection ${index + 1}`}</p>
      <div className={styles.subSectionHeader}>
        <div>
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
          <select
            value={subSection.type}
            title="Subsection Type"
            className={styles.customInput}
            onChange={(e: any) =>
              setSubSection(subSection.id, { type: e.target.value })
            }
          >
            <option value="single">Single</option>
            <option value="multiple">Multiple</option>
            <option value="integer">Integer</option>
            <option value="paragraph">Paragraph</option>
            <option value="matrix">Matrix</option>
          </select>
        </div>
        <div>
          <IconButton onClick={() => handleDeleteSubSection(subSection.id)}>
            <img src={closeCircleIcon} alt="Delete Sub-Section" />
          </IconButton>
        </div>
      </div>
    </div>
  );
};

interface IInputProps {
  type?: HTMLInputTypeAttribute;
  value: any;
  onChange: (e: any) => void;
  label?: string;
  inputProps?: any;
  id?: string;
}

const CustomInputSection: React.FC<IInputProps> = ({
  type,
  id,
  label,
  value,
  onChange,
  inputProps,
}) => {
  return (
    <input
      className={styles.customInput}
      title={label}
      onChange={onChange}
      type={type}
      value={value}
      id={id}
      placeholder={label}
      {...inputProps}
    />
  );
};
