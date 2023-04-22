import { useState } from "react";
import styles from "./StudentRegister.module.scss";
import { Stepper, Step, StepButton } from "@mui/material";
import AccountDetails, {
  AccountDetailsValues,
} from "./components/AccountDetails";
import PersonalDetails, {
  PersonalDetailsValues,
} from "./components/PersonalDetails";
import AcademicDetails, {
  AcademicDetailsValues,
} from "./components/AcademicDetails";
import { API_USERS } from "../../utils/api";
import { message } from "antd";
import logo from "../../assets/images/logo.svg";

const StudentRegister: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [values, setValues] = useState({
    accountDetails: {} as AccountDetailsValues,
    personalDetails: {} as PersonalDetailsValues,
    academicDetails: {} as AcademicDetailsValues,
  });

  const stepsHeader: string[] = [
    "Create Account",
    "Personal Details",
    "Academic Details",
  ];

  function handleSubmitAccountDetails(vals: AccountDetailsValues) {
    console.log(vals);
    setValues({
      ...values,
      accountDetails: vals,
    });
    setActiveStep(1);
  }
  function handleSubmitPersonalDetails(vals: PersonalDetailsValues) {
    console.log(vals);
    setValues({
      ...values,
      personalDetails: vals,
    });
    setActiveStep(2);
  }
  function handleSubmitAcademicDetails(vals: AcademicDetailsValues) {
    console.log(vals);
    setValues({
      ...values,
      academicDetails: vals,
    });
    let finalvalues: any = {
      ...values.accountDetails,
      ...values.personalDetails,
      ...vals,
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      createdBy: {
        id: "self",
        userType: "student",
      },
      userType: "student",
      roles: [],
    };
    finalvalues.parentDetails = {
      name: finalvalues.parentName,
      contact: finalvalues.parentContact,
    };
    finalvalues.email = finalvalues.email.toLowerCase();
    delete finalvalues.parentName;
    delete finalvalues.parentContact;
    delete finalvalues.confirmPassword;
    createStudentAccount(finalvalues);
  }

  async function createStudentAccount(finalVals: any) {
    try {
      const res = await API_USERS().post(`/student/create`, finalVals);
      message.success("Student account created successfully");
    } catch (error) {
      console.log("ERROR_CREATING_STUDENT_ACCOUNT", error);
      message.error("Error creating student account");
    }
  }

  return (
    <div className={styles.container}>
      <nav className={styles.flexRow}>
        <img src={logo} alt="logo" />
      </nav>
      <div className={styles.content}>
        <h2>Student Registration</h2>
        <div className={styles.stepsHeader}>
          <Stepper nonLinear activeStep={activeStep}>
            {stepsHeader.map((label, index) => (
              <Step key={label} completed={activeStep > index}>
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
