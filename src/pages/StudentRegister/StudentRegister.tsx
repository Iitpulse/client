import { useState } from "react";
import styles from "./StudentRegister.module.scss";
import { Stepper, Step, StepButton } from "@mui/material";
import { Button, message, Steps, theme } from "antd";
import AccountDetails, {
  AccountDetailsValues,
} from "./components/AccountDetails";
import PersonalDetails, {
  PersonalDetailsValues,
} from "./components/PersonalDetails";
import AcademicDetails, {
  AcademicDetailsValues,
} from "./components/AcademicDetails";
import { API_USERS } from "../../utils/api/config";
import logo from "../../assets/images/logo.svg";
import { useNavigate } from "react-router";

const StudentRegister: React.FC = () => {
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();
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
    // console.log(vals);
    setValues({
      ...values,
      accountDetails: vals,
    });
    next();
  }
  function handleSubmitPersonalDetails(vals: PersonalDetailsValues) {
    console.log(vals);
    setValues({
      ...values,
      personalDetails: vals,
    });
    next();
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
    finalvalues.email = finalvalues?.email?.toLowerCase();
    delete finalvalues.parentName;
    delete finalvalues.parentContact;
    delete finalvalues.confirmPassword;
    finalvalues.isPhoneVerified = true;
    createStudentAccount(finalvalues);
  }

  async function createStudentAccount(finalVals: any) {
    try {
      const res = await API_USERS().post(`/student/create-student`, finalVals);
      message.success("Student account created successfully");
      navigate("/login");
    } catch (err: any) {
      console.log("ERROR_CREATING_STUDENT_ACCOUNT", { err });
      // message.error("Error creating student account");
      message.error(
        err?.response?.data?.message || "Error creating student account"
      );
    }
  }

  const next = () => {
    setCurrent(current + 1);
  };

  const prev = () => {
    setCurrent(current - 1);
  };
  const steps = [
    {
      title: "Create Account",
      content: <AccountDetails handleSubmit={handleSubmitAccountDetails} />,
    },
    {
      title: "Personal Details",
      content: <PersonalDetails handleSubmit={handleSubmitPersonalDetails} />,
    },
    {
      title: "Academic Details",
      content: (
        <AcademicDetails
          handleSubmit={handleSubmitAcademicDetails}
          setPrev={prev}
        />
      ),
    },
  ];
  const items = steps.map((item) => ({ key: item.title, title: item.title }));

  return (
    <div
      style={{
        minHeight: "100vh",
        height: "fit-content",
      }}
    >
      <div className={styles.container}>
        <nav className={styles.flexRow}>
          <img src={logo} alt="logo" />
        </nav>
        <div className={styles.content}>
          <h2>Student Registration</h2>
          {/* <div className={styles.stepsHeader}> */}
          {/* <Stepper nonLinear activeStep={activeStep}>
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
          </Stepper> */}
          {/* <Steps current={current} items={items} /> */}
          <Steps current={current} items={items} />
          {/* </div> */}
          <div className={styles.stepsContent}>
            {steps[current].content}
            <div style={{ marginTop: 24 }}>
              {/* {current < steps.length - 1 && (
            <Button type="primary" onClick={() => next()}>
              Next
            </Button>
          )}
          {current === steps.length - 1 && (
            <Button type="primary" disabled>
              Next
            </Button>
          )} */}
              {current === steps.length - 1 && (
                <Button
                  size="large"
                  style={{ width: "100%" }}
                  onClick={() => prev()}
                >
                  Previous
                </Button>
              )}

              {/* {current === 0 && (
            <Button style={{ margin: '0 8px' }} disabled>
              Previous
            </Button>
        </div> 
          {/* {activeStep === 0 && (
            <AccountDetails handleSubmit={handleSubmitAccountDetails} />
          )}
          {activeStep === 1 && (
            <PersonalDetails handleSubmit={handleSubmitPersonalDetails} />
          )}
          {activeStep === 2 && (
            <AcademicDetails handleSubmit={handleSubmitAcademicDetails} />
          )} */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentRegister;
