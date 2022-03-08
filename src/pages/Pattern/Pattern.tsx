import React, { useState } from "react";
import styles from "./Pattern.module.scss";
import { Sidebar, NotificationCard } from "../../components";
import { StyledMUITextField } from "../Users/components";
import { ISection, ISubSection } from "../../utils/interfaces";
import clsx from "clsx";

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
          {sections.map((section) => (
            <Section section={section} setSection={handleChangeSection} />
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
}> = ({ section, setSection }) => {
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

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <StyledMUITextField
          value={section.name}
          label="Name"
          onChange={(e: any) =>
            setSection(section.id, { name: e.target.value })
          }
        />
        <StyledMUITextField
          value={section.exam}
          label="Exam"
          onChange={(e: any) =>
            setSection(section.id, { exam: e.target.value })
          }
        />
        <StyledMUITextField
          value={section.subject}
          label="Subject"
          onChange={(e: any) =>
            setSection(section.id, { subject: e.target.value })
          }
        />
        <StyledMUITextField
          value={section.toBeAttempted}
          label="Questions To be Attempted"
          type="number"
          inputProps={{ min: 1 }}
          onChange={(e: any) =>
            setSection(section.id, { toBeAttempted: e.target.value })
          }
        />
      </div>
      {section.subSections.map((subSection) => (
        <SubSection
          subSection={subSection}
          setSubSection={handleChangeSubSection}
        />
      ))}
      <div
        className={clsx(styles.addSection, styles.addSubSection)}
        onClick={handleClickAddNewSubSection}
      >
        <p>+ Add New Sub-Section</p>
      </div>
    </div>
  );
};

const SubSection: React.FC<{
  subSection: ISubSection;
  setSubSection: (id: string, data: any) => void;
}> = ({ subSection, setSubSection }) => {
  return (
    <div className={styles.subSection}>
      <div className={styles.subSectionHeader}>
        <StyledMUITextField
          value={subSection.name}
          label="Name"
          onChange={(e: any) =>
            setSubSection(subSection.id, { name: e.target.value })
          }
        />
      </div>
    </div>
  );
};
