import * as React from "react";
import styles from "./Questions.module.scss";
import {
  TextField,
  FormControl,
  MenuItem,
  Select,
  InputLabel,
  Chip,
  Autocomplete,
  SelectChangeEvent,
} from "@mui/material";
import { styled } from "@mui/system";
import { Sidebar, NotificationCard } from "../../components";
import { useState } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

// KaTeX dependency for math support
// import katex from "katex";
// import "katex/dist/katex.css";
// window.katex = katex;

export const questionTypes = [
  { name: "Single Correct", value: "single" },
  { name: "Multiple Correct", value: "multiple" },
  { name: "Matrix Match", value: "matrix" },
  { name: "Integer Type", value: "integer" },
];

export const subjects = [
  {
    name: "Physics",
    value: "physics",
  },
  {
    name: "Mathematics",
    value: "mathematics",
  },
  {
    name: "Chemistry",
    value: "chemistry",
  },
];

export const chapters = [
  {
    name: "Fluid Mechanics",
    value: "fluidMechanics",
  },
  {
    name: "Sets Relation and Functions",
    value: "setsRelationAndFunction",
  },
  {
    name: "Phenol",
    value: "phenol",
  },
];

export const topicOptions = [
  { name: `Coulomb's law`, value: "coulombsLaw" },
  { name: "Organic", value: "organic" },
  { name: "Hydrocarbons", value: "hydrocarbons" },
  { name: "Probability", value: "probability" },
  { name: "Tangets", value: "tangets" },
  { name: "Ideal Gas Equation", value: "idealGasEquation" },
  { name: "Dual Nature", value: "dualNature" },
  { name: "Normals", value: "normals" },
  { name: `Newton's Law of Motion`, value: "newtonsLawofMotion" },
];

export const difficultyLevels = [
  { name: "Easy", value: "easy" },
  { name: "Medium", value: "medium" },
  { name: "Hard", value: "hard" },
];

export const sources = [
  { name: "Bansal Classes", value: "bansalClasses" },
  { name: "Allen", value: "allen" },
  { name: "Catalyser", value: "catalyser" },
];

export const examList = [
  {
    name: "JEE MAINS",
    value: "JEEMains",
  },
  {
    name: "JEE ADVANCED",
    value: "JEEAdvanced",
  },
  {
    name: "NEET UG",
    value: "NEETUG",
  },
];

const Questions = () => {
  const [id, setId] = useState<string>("QM_ABC123");
  const [exams, setExams] = useState<Array<string>>([]);
  const [type, setType] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const [chapter, setChapter] = useState<Array<string>>([]);
  const [topics, setTopics] = useState<Array<string>>([]);
  const [difficulty, setDifficulty] = useState<string>("");
  const [source, setSource] = useState<string>("");
  const [uploadedBy, setUploadedBy] = useState<string>("John Doe");

  React.useEffect(() => {
    console.log({
      id,
      type,
      subject,
      chapter,
      topics,
      difficulty,
      source,
      uploadedBy,
    });
  });

  const [value, setValue] = useState("");

  const modules = {
    toolbar: [
      [{ header: [1, 2, false] }],
      ["bold", "italic", "underline", "strike", "blockquote"],
      [
        { list: "ordered" },
        { list: "bullet" },
        { indent: "-1" },
        { indent: "+1" },
      ],
      ["link", "image"],
      ["clean"],
      ["formula"], // NOT WORKING YET
    ],
  };

  const formats = [
    "header",
    "bold",
    "italic",
    "underline",
    "strike",
    "blockquote",
    "list",
    "bullet",
    "indent",
    "link",
    "image",
    "formula", // NOT WORKING YET
  ];

  React.useEffect(() => {
    console.log({ value });
  }, [value]);

  return (
    <div className={styles.container}>
      <form>
        <div className={styles.inputFields}>
          <StyledMUITextField
            id="id"
            disabled
            label="Id"
            value={id}
            variant="outlined"
          />
          <MUIChipsAutocomplete
            label="Exam(s)"
            options={examList}
            onChange={setExams}
          />
          <StyledMUISelect
            label={"Type"}
            options={questionTypes}
            state={type}
            onChange={setType}
          />
          <StyledMUISelect
            label={"Subject"}
            options={subjects}
            state={subject}
            onChange={setSubject}
          />
          <MUIChipsAutocomplete
            label="Chapter(s)"
            options={chapters}
            onChange={setChapter}
          />
          <MUIChipsAutocomplete
            label="Topics"
            options={topicOptions}
            onChange={setTopics}
          />
          <StyledMUISelect
            label={"Difficulty"}
            options={difficultyLevels}
            state={difficulty}
            onChange={setDifficulty}
          />
          <MUISimpleAutocomplete
            label={"Source"}
            options={sources}
            onChange={setSource}
          />
          <StyledMUITextField
            id="uploadedBy"
            value={uploadedBy}
            label="Uploaded By"
            disabled
            variant="outlined"
          />
        </div>
      </form>
      <main>
        <ReactQuill
          theme="snow"
          value={value}
          onChange={setValue}
          modules={modules}
          formats={formats}
        />
      </main>
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
    </div>
  );
};

interface MUISelectProps {
  label: string;
  state: string;
  options: Array<{
    name: string;
    value: string;
  }>;
  onChange: React.Dispatch<React.SetStateAction<string>>;
}

const MUISelect = (props: MUISelectProps) => {
  const handleChange = (event: SelectChangeEvent<string>) => {
    props.onChange(event.target.value);
  };
  return (
    <StyledFormControl sx={{ minWidth: 250 }}>
      <InputLabel id="demo-simple-select-helper-label">
        {props.label}
      </InputLabel>
      <Select
        labelId="demo-simple-select-helper-label"
        id="demo-simple-select-helper"
        value={props.state}
        label="Age"
        onChange={handleChange}
      >
        {props.options.map((item, index) => (
          <MenuItem key={index} value={item.value}>
            {item.name}
          </MenuItem>
        ))}
      </Select>
    </StyledFormControl>
  );
};

interface MUIAutocompleteProps {
  label: string;
  state?: string;
  onChange: any;
  options: Array<{
    name: string;
    value: string;
  }>;
}

const MUIChipsAutocomplete = (props: MUIAutocompleteProps) => {
  return (
    <Autocomplete
      multiple
      id="tags-outlined"
      onChange={(_, value) =>
        props.onChange(
          value.map((item) => {
            return item.value;
          })
        )
      }
      options={props.options}
      getOptionLabel={(option) => option.name}
      filterSelectedOptions
      renderInput={(params) => (
        <TextField
          {...params}
          label={props.label}
          placeholder={"Search for " + props.label}
        />
      )}
    />
  );
};

const MUISimpleAutocomplete = (props: MUIAutocompleteProps) => {
  return (
    <Autocomplete
      className={styles.something}
      disablePortal
      id="combo-box-demo"
      options={props.options}
      onChange={(_, value) => props.onChange(value?.value || "")}
      getOptionLabel={(option) => option.name || ""}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder={"Search for" + props.label}
          label={props.label}
        />
      )}
    />
  );
};

const StyledMUITextField = styled(TextField)(() => {
  return {
    minWidth: "250px",
    input: {
      fontSize: "1rem",
      padding: "1.2rem 1.3rem",
    },
    label: {
      fontSize: "1rem",
      maxWidth: "none",
      padding: "0rem 0.5rem",
      backgroundColor: " #f3f3f9",
    },
    ".MuiInputLabel-root.Mui-focused": {
      transform: "translate(12px, -9px) scale(0.75)",
    },
    ".MuiFormLabel-filled": {
      transform: "translate(12px, -9px) scale(0.75)",
    },
  };
});

const StyledMUISelect = styled(MUISelect)(() => {
  return {
    minWidth: "250px",
    input: {
      fontSize: "1rem",
      padding: "1.2rem 1.3rem",
    },

    ".MuiInputLabel-root.Mui-focused": {
      transform: "translate(12px, -9px) scale(0.75)",
    },
    ".MuiFormLabel-filled": {
      transform: "translate(12px, -9px) scale(0.75)",
    },
  };
});

const StyledFormControl = styled(FormControl)(() => {
  return {
    minWidth: "250px",
    input: {
      fontSize: "1rem",
      padding: "1.2rem 1.3rem",
    },
    label: {
      fontSize: "1rem",
      maxWidth: "none",
      padding: "0rem 0.5rem",
      backgroundColor: " #f3f3f9",
    },
    ".MuiInputLabel-root.Mui-focused": {
      transform: "translate(12px, -9px) scale(0.75)",
    },
    ".MuiFormLabel-filled": {
      transform: "translate(12px, -9px) scale(0.75)",
    },
  };
});

export default Questions;
