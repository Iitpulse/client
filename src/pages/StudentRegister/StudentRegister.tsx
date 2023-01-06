import styles from "./StudentRegister.module.scss";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepButton from "@mui/material/StepButton";
import { useState } from "react";
import PersonalDetails, {
  PersonalDetailsValues,
} from "./components/PersonalDetails";

const StudentRegister: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);

  const stepsHeader: string[] = [
    "Create Account",
    "Personal Details",
    "Academic Details",
  ];

  function handleSubmitPersonalDetails(values: PersonalDetailsValues) {
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
                <StepButton color="inherit">{label}</StepButton>
              </Step>
            ))}
          </Stepper>
        </div>
        <div className={styles.stepsContent}>
          {activeStep === 0 && (
            <PersonalDetails handleSubmit={handleSubmitPersonalDetails} />
          )}
          {activeStep === 1 && <div>Step 2</div>}
          {activeStep === 2 && <div>Step 3</div>}
        </div>
      </div>
    </div>
  );
};

export default StudentRegister;
