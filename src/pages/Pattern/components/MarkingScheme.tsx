import { IconButton } from "@mui/material";
import { useState } from "react";
import CustomInputSection from "./CustomInputSection";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";

interface IMarkingSchemeProps {
  vcorrect: Array<number>;
  vincorrect: number;
  subSectionId: string;
  type: string;
  setSubSection: (id: string, data: any) => void;
}

const MarkingScheme: React.FC<IMarkingSchemeProps> = ({
  vcorrect,
  vincorrect,
  subSectionId,
  type,
  setSubSection,
}) => {
  const [markingSchemeCorrect, setMarkingSchemeCorrect] =
    useState<Array<number>>(vcorrect);
  const [markingSchemeIncorrect, setMarkingSchemeIncorrect] =
    useState<number>(vincorrect);
  const handleAddCorrectInput = () => {
    setMarkingSchemeCorrect((data: Array<number>) => [...data, 1]);
  };
  const handleDeleteCorrectInput = () => {
    // setMarkingSchemeCorrect((data: Array<number>) => [...data, 1]);
    let arr = markingSchemeCorrect;
    arr.pop();
    // console.log(arr);
    setMarkingSchemeCorrect([...arr]);
  };
  return (
    <>
      <CustomInputSection
        value={markingSchemeIncorrect}
        label="Incorrect Marks"
        type="number"
        inputProps={{ max: 0 }}
        onChange={(e: any) => {
          console.log(vcorrect);
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
            label={`Correct Marks ${idx ? idx + 1 : ""}`}
            type="number"
            inputProps={{ min: 1 }}
            onChange={(e: any) => {
              let correct = [...markingSchemeCorrect];
              correct[idx] = parseInt(e.target.value);
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
      {type !== "single" && type !== "integer" && (
        <IconButton
          style={{
            marginTop: "20px",
          }}
          onClick={handleAddCorrectInput}
        >
          <AddIcon />
        </IconButton>
      )}
      {type !== "single" &&
        type !== "integer" &&
        markingSchemeCorrect.length >= 2 && (
          <IconButton
            style={{
              marginTop: "20px",
            }}
            onClick={handleDeleteCorrectInput}
          >
            <RemoveIcon />
          </IconButton>
        )}
    </>
  );
};

export default MarkingScheme;
