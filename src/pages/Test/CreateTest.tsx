import styles from "./CreateTest.module.scss";
import { Sidebar } from "../../components";
import { useState } from "react";
import { ITest } from "../../utils/interfaces";
import { SAMPLE_TEST } from "../../utils/constants";
import { StyledMUITextField } from "../Users/components";
import DateRangePicker from "@mui/lab/DateRangePicker";
import AdapterDateFns from "@mui/lab/AdapterDateFns";
import LocalizationProvider from "@mui/lab/LocalizationProvider";
import { TextField } from "@mui/material";
import { Box } from "@mui/system";

const CreateTest = () => {
  const [test, setTest] = useState<ITest>(SAMPLE_TEST);
  const { id, name, description, exam, status, validity, sections } = test;

  function onChangeInput(e: any) {
    setTest((prev) => ({ ...prev, [e.target.id]: e.target.value }));
  }

  function handleChangeValidity(newValue: any) {
    setTest({ ...test, validity: { from: newValue[0], to: newValue[1] } });
  }

  return (
    <>
      <div className={styles.container}>
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
                <TextField {...startProps} />
                <Box sx={{ mx: 2 }}> to </Box>
                <TextField {...endProps} />
              </>
            )}
          />
        </LocalizationProvider>
      </div>
      <Sidebar title="Recent Activity">Recent</Sidebar>
    </>
  );
};

export default CreateTest;
