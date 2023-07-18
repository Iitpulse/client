import { IconButton, Tooltip } from "@mui/material";
import { ISection } from "../../../../utils/interfaces";
import {
  CustomAccordion,
  CustomAccordionDetails,
  CustomAccordionSummary,
} from "../CustomAccordion";
import duplicateIcon from "../../../../assets/icons/duplicate.svg";
import CustomInputSection from "../CustomInputSection";
import styles from "../../Pattern.module.scss";
import clsx from "clsx";
import deleteIcon from "../../../../assets/icons/delete.svg";
import CustomSelect from "../CustomSelect";
import SubSection from "./SubSection";
import { TEST } from "../../../../utils/constants";

const Section: React.FC<{
  section: ISection;
  setSection: (id: string, data: any) => void;
  handleDeleteSection: (id: string) => void;
  handleDuplicateSection: (id: string) => void;
  index: number;
  helperTexts?: any;
  subjects: Array<any>;
}> = ({
  section,
  setSection,
  handleDeleteSection,
  index,
  subjects,
  handleDuplicateSection,
  helperTexts,
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
        {
          ...TEST.SAMPLE_SUB_SECTION,
          id: `${Math.random() * 100}`,
          type: "single",
        },
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
            error={helperTexts[`sections.${index}.name`]}
            onChange={(e: any) =>
              setSection(section.id, { name: e.target.value })
            }
          />
          <CustomSelect
            id="sction-subject"
            value={section.subject}
            label="Subject"
            error={helperTexts[`sections.${index}.subject`]}
            onChange={(e: any) => {
              setSection(section.id, { subject: e.target.value });
            }}
            options={subjects?.map((subject) => ({
              label: subject.name,
              value: subject.name,
            }))}
          />
          {/* <CustomInputSection
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
          /> */}
        </div>
        {section.subSections.map((subSection, i) => (
          <SubSection
            key={i}
            subSection={subSection}
            setSubSection={handleChangeSubSection}
            handleDeleteSubSection={handleDeleteSubSection}
            index={i}
            helperTexts={helperTexts}
            sectionIndex={index}
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

export default Section;
