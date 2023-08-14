import { IconButton } from "@mui/material";
import { useState, useEffect } from "react";
import CustomInputSection from "./CustomInputSection";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";

interface IMarkingSchemeProps {
  vcorrect: Array<number>;
  vincorrect: number;
  subSectionId: string;
  type: string;
  setSubSection: (id: string, data: any) => void;
  errorCorrect?: Array<string>;
  errorIncorrect?: string;
}

const MarkingScheme: React.FC<IMarkingSchemeProps> = ({
  vcorrect,
  vincorrect,
  subSectionId,
  type,
  setSubSection,
  errorCorrect,
  errorIncorrect,
}) => {
  const [markingSchemeCorrect, setMarkingSchemeCorrect] =
    useState<Array<number>>(vcorrect);
  const [markingSchemeIncorrect, setMarkingSchemeIncorrect] =
    useState<number>(vincorrect*-1);
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
  useEffect(() => {
    if (
      (type === "single" || type === "integer") &&
      markingSchemeCorrect?.length > 1
    ) {
      setMarkingSchemeCorrect([4]);
    }
  }, [type]);
  return (
    <>
      <CustomInputSection
        error={errorIncorrect}
        value={markingSchemeIncorrect}
        label="Incorrect Marks"
        type="number"
        inputProps={{ min: 0 }}
        onChange={(e: any) => {
          console.log(vcorrect);
          setSubSection(subSectionId, {
            markingScheme: {
              incorrect: (-1*parseInt(e.target.value)),
              correct: markingSchemeCorrect,
            },
          });
          setMarkingSchemeIncorrect(parseInt(e.target.value));
          console.log(markingSchemeIncorrect);
        }}
      />
      {markingSchemeCorrect.map((correctMark: number, idx: number) => {
        return (
          <CustomInputSection
            error={(errorCorrect && errorCorrect[idx]) || ""}
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
                  incorrect: (-1*markingSchemeIncorrect),
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
