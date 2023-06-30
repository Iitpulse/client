import { IconButton } from "@mui/material";
import { ISubSection } from "../../../../utils/interfaces";
import CustomInputSection from "../CustomInputSection";
import CustomSelect from "../CustomSelect";
import styles from "../../Pattern.module.scss";
import closeCircleIcon from "../../../../assets/icons/close-circle.svg";
import MarkingScheme from "../MarkingScheme";

const SubSection: React.FC<{
  subSection: ISubSection;
  setSubSection: (id: string, data: any) => void;
  handleDeleteSubSection: (id: string) => void;
  helperTexts?: any;
  sectionIndex: number;
  index: number;
}> = ({
  subSection,
  setSubSection,
  handleDeleteSubSection,
  index,
  sectionIndex,
  helperTexts,
}) => {
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
  const ParagraphTypes = [
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
          error={
            helperTexts[`sections.${sectionIndex}.subSections.${index}.name`]
          }
          value={subSection.name}
          label="Name"
          onChange={(e: any) =>
            setSubSection(subSection.id, { name: e.target.value })
          }
        />
        <CustomInputSection
          error={
            helperTexts[
              `sections.${sectionIndex}.subSections.${index}.description`
            ]
          }
          value={subSection.description}
          label="Description"
          onChange={(e: any) =>
            setSubSection(subSection.id, { description: e.target.value })
          }
        />
        <CustomSelect
          id="subsection-type"
          error={
            helperTexts[`sections.${sectionIndex}.subSections.${index}.type`]
          }
          value={subSection.type}
          label="Subsection Type"
          onChange={(e: any) => {
            setSubSection(subSection.id, { type: e.target.value });
          }}
          options={subSectionTypes}
        />
        {subSection.type === "paragraph" && (
          <CustomSelect
            error={
              helperTexts[
                `sections.${sectionIndex}.subSections.${index}.paragraphType`
              ]
            }
            id="paragraph-type"
            value={subSection.paragraphType}
            label="Paragraph Type"
            onChange={(e: any) => {
              setSubSection(subSection.id, { paragraphType: e.target.value });
            }}
            options={ParagraphTypes}
          />
        )}
        <CustomInputSection
          error={
            helperTexts[
              `sections.${sectionIndex}.subSections.${index}.totalQuestions`
            ]
          }
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
          error={
            helperTexts[
              `sections.${sectionIndex}.subSections.${index}.toBeAttempted`
            ]
          }
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
          errorCorrect={[
            ...Object.keys(helperTexts)
              ?.filter((key) =>
                key.startsWith(
                  `sections.${sectionIndex}.subSections.${index}.markingScheme.correct`
                )
              )
              .map((key) => helperTexts[key]),
          ]}
          errorIncorrect={
            helperTexts[
              `sections.${sectionIndex}.subSections.${index}.markingScheme.incorrect`
            ]
          }
          vcorrect={
            subSection.markingScheme.correct.length > 0
              ? subSection.markingScheme.correct
              : [4]
          }
          vincorrect={subSection.markingScheme.incorrect}
          type={subSection.type}
          subSectionId={subSection.id}
          setSubSection={setSubSection}
        />
      </div>
    </div>
  );
};

export default SubSection;
