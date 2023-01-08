import styles from "./StudentRegister.module.scss";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepButton from "@mui/material/StepButton";
import { useState } from "react";
import AccountDetails, {
  AccountDetailsValues,
} from "./components/AccountDetails";
import PersonalDetails, {
  PersonalDetailsValues,
} from "./components/PersonalDetails";
import AcademicDetails, {
  AcademicDetailsValues,
} from "./components/AcademicDetails";

const StudentRegister: React.FC = () => {
  const [activeStep, setActiveStep] = useState(1);

  const stepsHeader: string[] = [
    "Create Account",
    "Personal Details",
    "Academic Details",
  ];

  function handleSubmitAccountDetails(values: AccountDetailsValues) {
    console.log(values);
  }
  function handleSubmitPersonalDetails(values: PersonalDetailsValues) {
    console.log(values);
  }
  function handleSubmitAcademicDetails(values: AcademicDetailsValues) {
    console.log(values);
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h2>Student Registration</h2>
        <div className={styles.stepsHeader}>
          <Stepper nonLinear activeStep={activeStep}>
            {stepsHeader.map((label, index) => (
              <Step key={label} completed={false}>
                <StepButton
                  color="inherit"
                  onClick={() => {
                    setActiveStep(index);
                  }}
                >
                  {label}
                </StepButton>
              </Step>
            ))}
          </Stepper>
        </div>
        <div className={styles.stepsContent}>
          {activeStep === 0 && (
            <AccountDetails handleSubmit={handleSubmitAccountDetails} />
          )}
          {activeStep === 1 && (
            <PersonalDetails handleSubmit={handleSubmitPersonalDetails} />
          )}
          {activeStep === 2 && (
            <AcademicDetails handleSubmit={handleSubmitAcademicDetails} />
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentRegister;
