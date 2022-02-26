import { Sidebar, NotificationCard, Button } from "../../components";
import styles from "./Users.module.scss";
import { useState, useEffect } from "react";
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
import clsx from "clsx";
import "./Users.css";
import closeIcon from "../../assets/icons/close-circle.svg";
import info from "../../assets/icons/info.svg";

const UserTypesForCards = [
  {
    title: "Student",
    icon: "Some Icon",
    description: "This is Description about Student",
  },
  {
    title: "Teacher",
    icon: "Some Icon",
    description: "This is Description about Teacher",
  },
  {
    title: "Admin",
    icon: "Some Icon",
    description: "This is Description about Admin",
  },
  {
    title: "Operator",
    icon: "Some Icon",
    description: "This is Description about Operator",
  },
  {
    title: "Manager",
    icon: "Some Icon",
    description: "This is Description about Manager",
  },
];

const Users = () => {
  // For Modal
  const id = "IITP_TT_ABC12334";
  const uploadedBy = "John Doe";
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [preparingFor, setPreparingFor] = useState<string>("");
  const [adhaarNumber, setAdhaarNumber] = useState<string>("");
  const [personalContact, setPersonalContact] = useState<string>("");
  const [emergencyContact, setEmergencyContact] = useState<string>("");
  const [currentAddress, setCurrentAddress] = useState<string>("");
  const [permanentAddress, setPermanentAddress] = useState<string>("");

  //For Option Menu
  const [selectedUserType, setSelectedUserType] = useState<string>("");
  const [isModalRequested, setIsModalRequested] = useState<boolean>(false);

  function submitHandler(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    //BEFORE SUBMITTING MAKE SURE that you don't send values that are Empty string which are not the part of their respective form

    //After Submitting the form
    setName("");
    setEmail("");
    setPreparingFor("");
    setAdhaarNumber("");
    setPermanentAddress("");
    setCurrentAddress("");
    setEmergencyContact("");
    setPersonalContact("");
  }
  function handleReset() {
    setName("");
    setEmail("");
    setPreparingFor("");
    setAdhaarNumber("");
    setPermanentAddress("");
    setCurrentAddress("");
    setEmergencyContact("");
    setPersonalContact("");
  }
  return (
    <div className={styles.container}>
      <main>
        <h1>What Type of User do you want to add ?</h1>
        <div className={styles.cards}>
          {" "}
          {UserTypesForCards.map((user, i) => {
            return (
              <UserCard
                key={i}
                onClick={() => {
                  setSelectedUserType(user.title);
                  setIsModalRequested(true);
                }}
                title={user.title}
                icon={user.icon}
                description={user.description}
              />
            );
          })}
          {isModalRequested && selectedUserType === "Student" && (
            <Student
              id={id}
              setIsModalRequested={setIsModalRequested}
              onSubmit={submitHandler}
              name={name}
              setName={setName}
              email={email}
              setEmail={setEmail}
              preparingFor={preparingFor}
              setPreparingFor={setPreparingFor}
              adhaarNumber={adhaarNumber}
              setAdhaarNumber={setAdhaarNumber}
              permanentAddress={permanentAddress}
              setPermanentAddress={setPermanentAddress}
              currentAddress={currentAddress}
              setCurrentAddress={setCurrentAddress}
              personalContact={personalContact}
              setPersonalContact={setPersonalContact}
              emergencyContact={emergencyContact}
              setEmergencyContact={setEmergencyContact}
              uploadedBy={uploadedBy}
              handleReset={handleReset}
            />
          )}
          {isModalRequested && selectedUserType === "Teacher" && (
            <Teacher
              id={id}
              setIsModalRequested={setIsModalRequested}
              onSubmit={submitHandler}
              name={name}
              setName={setName}
              email={email}
              setEmail={setEmail}
              adhaarNumber={adhaarNumber}
              setAdhaarNumber={setAdhaarNumber}
              permanentAddress={permanentAddress}
              setPermanentAddress={setPermanentAddress}
              currentAddress={currentAddress}
              setCurrentAddress={setCurrentAddress}
              personalContact={personalContact}
              setPersonalContact={setPersonalContact}
              emergencyContact={emergencyContact}
              setEmergencyContact={setEmergencyContact}
              uploadedBy={uploadedBy}
              handleReset={handleReset}
            />
          )}
          {isModalRequested && selectedUserType === "Admin" && (
            <Admin
              id={id}
              setIsModalRequested={setIsModalRequested}
              onSubmit={submitHandler}
              name={name}
              setName={setName}
              email={email}
              setEmail={setEmail}
              adhaarNumber={adhaarNumber}
              setAdhaarNumber={setAdhaarNumber}
              permanentAddress={permanentAddress}
              setPermanentAddress={setPermanentAddress}
              currentAddress={currentAddress}
              setCurrentAddress={setCurrentAddress}
              personalContact={personalContact}
              setPersonalContact={setPersonalContact}
              emergencyContact={emergencyContact}
              setEmergencyContact={setEmergencyContact}
              uploadedBy={uploadedBy}
              handleReset={handleReset}
            />
          )}
          {isModalRequested && selectedUserType === "Manager" && (
            <Manager
              id={id}
              setIsModalRequested={setIsModalRequested}
              onSubmit={submitHandler}
              name={name}
              setName={setName}
              email={email}
              setEmail={setEmail}
              adhaarNumber={adhaarNumber}
              setAdhaarNumber={setAdhaarNumber}
              permanentAddress={permanentAddress}
              setPermanentAddress={setPermanentAddress}
              currentAddress={currentAddress}
              setCurrentAddress={setCurrentAddress}
              personalContact={personalContact}
              setPersonalContact={setPersonalContact}
              emergencyContact={emergencyContact}
              setEmergencyContact={setEmergencyContact}
              uploadedBy={uploadedBy}
              handleReset={handleReset}
            />
          )}
          {isModalRequested && selectedUserType === "Operator" && (
            <Operator
              id={id}
              setIsModalRequested={setIsModalRequested}
              onSubmit={submitHandler}
              name={name}
              setName={setName}
              email={email}
              setEmail={setEmail}
              adhaarNumber={adhaarNumber}
              setAdhaarNumber={setAdhaarNumber}
              permanentAddress={permanentAddress}
              setPermanentAddress={setPermanentAddress}
              currentAddress={currentAddress}
              setCurrentAddress={setCurrentAddress}
              personalContact={personalContact}
              setPersonalContact={setPersonalContact}
              emergencyContact={emergencyContact}
              setEmergencyContact={setEmergencyContact}
              uploadedBy={uploadedBy}
              handleReset={handleReset}
            />
          )}
        </div>
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

//----------------------------------------------User Type: Teacher

interface UserProps {
  setIsModalRequested: React.Dispatch<React.SetStateAction<boolean>>;
  onSubmit: (e: any) => void;
  name: string;
  setName: React.Dispatch<React.SetStateAction<string>>;
  email: string;
  setEmail: React.Dispatch<React.SetStateAction<string>>;
  preparingFor?: string;
  setPreparingFor?: React.Dispatch<React.SetStateAction<string>>;
  adhaarNumber: string;
  setAdhaarNumber: React.Dispatch<React.SetStateAction<string>>;
  permanentAddress: string;
  setPermanentAddress: React.Dispatch<React.SetStateAction<string>>;
  currentAddress: string;
  setCurrentAddress: React.Dispatch<React.SetStateAction<string>>;
  personalContact: string;
  setPersonalContact: React.Dispatch<React.SetStateAction<string>>;
  emergencyContact: string;
  setEmergencyContact: React.Dispatch<React.SetStateAction<string>>;
  uploadedBy: string;
  id: string;
  handleReset: () => void;
}

const Teacher = (props: UserProps) => {
  const {
    setIsModalRequested,
    onSubmit,
    name,
    setName,
    email,
    setEmail,
    adhaarNumber,
    setAdhaarNumber,
    permanentAddress,
    setPermanentAddress,
    currentAddress,
    setCurrentAddress,
    personalContact,
    setPersonalContact,
    emergencyContact,
    setEmergencyContact,
    uploadedBy,
    id,
    handleReset,
  } = props;
  return (
    <div className={clsx(styles.studentContainer, styles.modal)}>
      <form onSubmit={onSubmit}>
        <div className={styles.header}>
          <h2>Add a Teacher</h2>
          <img
            onClick={() => setIsModalRequested(false)}
            src={closeIcon}
            alt="Close"
          />
        </div>
        <div className={styles.inputFields}>
          <StyledMUITextField
            id="id"
            disabled
            label="Id"
            value={id}
            variant="outlined"
          />
          <StyledMUITextField
            id="name"
            required
            label="Name"
            value={name}
            onChange={(e: any) => setName(e.target.value)}
            variant="outlined"
          />

          <StyledMUITextField
            required
            className="largeWidthInput"
            id="currentAddress"
            value={currentAddress}
            onChange={(e: any) => setCurrentAddress(e.target.value)}
            label="Current Address"
            variant="outlined"
          />
          <StyledMUITextField
            required
            className="largeWidthInput"
            id="permanentAddress"
            value={permanentAddress}
            onChange={(e: any) => setPermanentAddress(e.target.value)}
            label="Permanent Address"
            variant="outlined"
          />
          <StyledMUITextField
            required
            id="email"
            value={email}
            onChange={(e: any) => setEmail(e.target.value)}
            label="Email"
            variant="outlined"
          />
          <StyledMUITextField
            required
            id="adhaarNumber"
            value={adhaarNumber}
            onChange={(e: any) => setAdhaarNumber(e.target.value)}
            label="Adhaar Number"
            variant="outlined"
          />
          <StyledMUITextField
            required
            id="personalContact"
            value={personalContact}
            onChange={(e: any) => setPersonalContact(e.target.value)}
            label="Personal Contact"
            variant="outlined"
          />
          <StyledMUITextField
            required
            id="emergencyContact"
            value={emergencyContact}
            onChange={(e: any) => setEmergencyContact(e.target.value)}
            label="Emergency Contact"
            variant="outlined"
          />

          <StyledMUITextField
            id="uploadedBy"
            className="uploadedBy"
            value={uploadedBy}
            label="Uploaded By"
            disabled
            variant="outlined"
          />
        </div>
        <div className={styles.buttons}>
          <Button>Submit</Button>
          <Button onClick={handleReset} type="button" color="warning">
            Reset
          </Button>
        </div>
      </form>
    </div>
  );
};

//----------------------------------------------User Type: Teacher

//----------------------------------------------User Type: Admin

const Admin = (props: UserProps) => {
  const {
    setIsModalRequested,
    onSubmit,
    name,
    setName,
    email,
    setEmail,
    adhaarNumber,
    setAdhaarNumber,
    permanentAddress,
    setPermanentAddress,
    currentAddress,
    setCurrentAddress,
    personalContact,
    setPersonalContact,
    emergencyContact,
    setEmergencyContact,
    uploadedBy,
    id,
    handleReset,
  } = props;

  return (
    <div className={clsx(styles.studentContainer, styles.modal)}>
      <form onSubmit={onSubmit}>
        <div className={styles.header}>
          <h2>Add an Admin</h2>
          <img
            onClick={() => setIsModalRequested(false)}
            src={closeIcon}
            alt="Close"
          />
        </div>
        <div className={styles.inputFields}>
          <StyledMUITextField
            id="id"
            disabled
            label="Id"
            value={id}
            variant="outlined"
          />
          <StyledMUITextField
            id="name"
            required
            label="Name"
            value={name}
            onChange={(e: any) => setName(e.target.value)}
            variant="outlined"
          />
          <StyledMUITextField
            required
            className="largeWidthInput"
            id="currentAddress"
            value={currentAddress}
            onChange={(e: any) => setCurrentAddress(e.target.value)}
            label="Current Address"
            variant="outlined"
          />
          <StyledMUITextField
            required
            className="largeWidthInput"
            id="permanentAddress"
            value={permanentAddress}
            onChange={(e: any) => setPermanentAddress(e.target.value)}
            label="Permanent Address"
            variant="outlined"
          />
          <StyledMUITextField
            required
            id="email"
            value={email}
            onChange={(e: any) => setEmail(e.target.value)}
            label="Email"
            variant="outlined"
          />
          <StyledMUITextField
            required
            id="adhaarNumber"
            value={adhaarNumber}
            onChange={(e: any) => setAdhaarNumber(e.target.value)}
            label="Adhaar Number"
            variant="outlined"
          />
          <StyledMUITextField
            required
            id="personalContact"
            value={personalContact}
            onChange={(e: any) => setPersonalContact(e.target.value)}
            label="Personal Contact"
            variant="outlined"
          />
          <StyledMUITextField
            required
            id="emergencyContact"
            value={emergencyContact}
            onChange={(e: any) => setEmergencyContact(e.target.value)}
            label="Emergency Contact"
            variant="outlined"
          />

          <StyledMUITextField
            id="uploadedBy"
            className="uploadedBy"
            value={uploadedBy}
            label="Uploaded By"
            disabled
            variant="outlined"
          />
        </div>
        <div className={styles.buttons}>
          <Button>Submit</Button>
          <Button onClick={handleReset} type="button" color="warning">
            Reset
          </Button>
        </div>
      </form>
    </div>
  );
};

//----------------------------------------------User Type: Admin

//----------------------------------------------User Type: Operator

const Operator = (props: UserProps) => {
  const {
    setIsModalRequested,
    onSubmit,
    name,
    setName,
    email,
    setEmail,
    adhaarNumber,
    setAdhaarNumber,
    permanentAddress,
    setPermanentAddress,
    currentAddress,
    setCurrentAddress,
    personalContact,
    setPersonalContact,
    emergencyContact,
    setEmergencyContact,
    uploadedBy,
    id,
    handleReset,
  } = props;
  return (
    <div className={clsx(styles.studentContainer, styles.modal)}>
      <form onSubmit={onSubmit}>
        <div className={styles.header}>
          <h2>Add an Operator</h2>
          <img
            onClick={() => setIsModalRequested(false)}
            src={closeIcon}
            alt="Close"
          />
        </div>
        <div className={styles.inputFields}>
          <StyledMUITextField
            id="id"
            disabled
            label="Id"
            value={id}
            variant="outlined"
          />
          <StyledMUITextField
            id="name"
            required
            label="Name"
            value={name}
            onChange={(e: any) => setName(e.target.value)}
            variant="outlined"
          />
          <StyledMUITextField
            required
            className="largeWidthInput"
            id="currentAddress"
            value={currentAddress}
            onChange={(e: any) => setCurrentAddress(e.target.value)}
            label="Current Address"
            variant="outlined"
          />
          <StyledMUITextField
            required
            className="largeWidthInput"
            id="permanentAddress"
            value={permanentAddress}
            onChange={(e: any) => setPermanentAddress(e.target.value)}
            label="Permanent Address"
            variant="outlined"
          />
          <StyledMUITextField
            required
            id="email"
            value={email}
            onChange={(e: any) => setEmail(e.target.value)}
            label="Email"
            variant="outlined"
          />
          <StyledMUITextField
            required
            id="adhaarNumber"
            value={adhaarNumber}
            onChange={(e: any) => setAdhaarNumber(e.target.value)}
            label="Adhaar Number"
            variant="outlined"
          />
          <StyledMUITextField
            required
            id="personalContact"
            value={personalContact}
            onChange={(e: any) => setPersonalContact(e.target.value)}
            label="Personal Contact"
            variant="outlined"
          />
          <StyledMUITextField
            required
            id="emergencyContact"
            value={emergencyContact}
            onChange={(e: any) => setEmergencyContact(e.target.value)}
            label="Emergency Contact"
            variant="outlined"
          />

          <StyledMUITextField
            id="uploadedBy"
            className="uploadedBy"
            value={uploadedBy}
            label="Uploaded By"
            disabled
            variant="outlined"
          />
        </div>
        <div className={styles.buttons}>
          <Button>Submit</Button>
          <Button onClick={handleReset} type="button" color="warning">
            Reset
          </Button>
        </div>
      </form>
    </div>
  );
};

//----------------------------------------------User Type: Operator

//----------------------------------------------User Type: Manager

const Manager = (props: UserProps) => {
  const {
    setIsModalRequested,
    onSubmit,
    name,
    setName,
    email,
    setEmail,
    adhaarNumber,
    setAdhaarNumber,
    permanentAddress,
    setPermanentAddress,
    currentAddress,
    setCurrentAddress,
    personalContact,
    setPersonalContact,
    emergencyContact,
    setEmergencyContact,
    uploadedBy,
    id,
    handleReset,
  } = props;
  return (
    <div className={clsx(styles.studentContainer, styles.modal)}>
      <form onSubmit={onSubmit}>
        <div className={styles.header}>
          <h2>Add a Manager</h2>
          <img
            onClick={() => setIsModalRequested(false)}
            src={closeIcon}
            alt="Close"
          />
        </div>
        <div className={styles.inputFields}>
          <StyledMUITextField
            id="id"
            disabled
            label="Id"
            value={id}
            variant="outlined"
          />
          <StyledMUITextField
            id="name"
            required
            label="Name"
            value={name}
            onChange={(e: any) => setName(e.target.value)}
            variant="outlined"
          />
          <StyledMUITextField
            required
            className="largeWidthInput"
            id="currentAddress"
            value={currentAddress}
            onChange={(e: any) => setCurrentAddress(e.target.value)}
            label="Current Address"
            variant="outlined"
          />
          <StyledMUITextField
            required
            className="largeWidthInput"
            id="permanentAddress"
            value={permanentAddress}
            onChange={(e: any) => setPermanentAddress(e.target.value)}
            label="Permanent Address"
            variant="outlined"
          />
          <StyledMUITextField
            required
            id="email"
            value={email}
            onChange={(e: any) => setEmail(e.target.value)}
            label="Email"
            variant="outlined"
          />
          <StyledMUITextField
            required
            id="adhaarNumber"
            value={adhaarNumber}
            onChange={(e: any) => setAdhaarNumber(e.target.value)}
            label="Adhaar Number"
            variant="outlined"
          />
          <StyledMUITextField
            required
            id="personalContact"
            value={personalContact}
            onChange={(e: any) => setPersonalContact(e.target.value)}
            label="Personal Contact"
            variant="outlined"
          />
          <StyledMUITextField
            required
            id="emergencyContact"
            value={emergencyContact}
            onChange={(e: any) => setEmergencyContact(e.target.value)}
            label="Emergency Contact"
            variant="outlined"
          />

          <StyledMUITextField
            id="uploadedBy"
            className="uploadedBy"
            value={uploadedBy}
            label="Uploaded By"
            disabled
            variant="outlined"
          />
        </div>
        <div className={styles.buttons}>
          <Button>Submit</Button>
          <Button onClick={handleReset} type="button" color="warning">
            Reset
          </Button>
        </div>
      </form>
    </div>
  );
};

//----------------------------------------------User Type: Manager

//----------------------------------------------User Type: Student

const Student = (props: UserProps) => {
  const {
    setIsModalRequested,
    onSubmit,
    name,
    setName,
    email,
    setEmail,
    adhaarNumber,
    setAdhaarNumber,
    permanentAddress,
    setPermanentAddress,
    currentAddress,
    setCurrentAddress,
    personalContact,
    setPersonalContact,
    emergencyContact,
    setEmergencyContact,
    uploadedBy,
    preparingFor,
    setPreparingFor,
    id,
    handleReset,
  } = props;
  return (
    <div className={clsx(styles.studentContainer, styles.modal)}>
      <form onSubmit={onSubmit}>
        <div className={styles.header}>
          <h2>Add a Student</h2>
          <img
            onClick={() => setIsModalRequested(false)}
            src={closeIcon}
            alt="Close"
          />
        </div>
        <div className={styles.inputFields}>
          <StyledMUITextField
            id="id"
            disabled
            label="Id"
            value={id}
            variant="outlined"
          />
          <StyledMUITextField
            id="name"
            required
            label="Name"
            value={name}
            onChange={(e: any) => setName(e.target.value)}
            variant="outlined"
          />
          <StyledMUITextField
            id="preparingFor"
            required
            value={preparingFor}
            onChange={(e: any) =>
              setPreparingFor ? setPreparingFor(e.target.value) : {}
            }
            label="Preparing For"
            variant="outlined"
          />
          <StyledMUITextField
            required
            className="largeWidthInput"
            id="currentAddress"
            value={currentAddress}
            onChange={(e: any) => setCurrentAddress(e.target.value)}
            label="Current Address"
            variant="outlined"
          />
          <StyledMUITextField
            required
            className="largeWidthInput"
            id="permanentAddress"
            value={permanentAddress}
            onChange={(e: any) => setPermanentAddress(e.target.value)}
            label="Permanent Address"
            variant="outlined"
          />
          <StyledMUITextField
            required
            id="email"
            value={email}
            onChange={(e: any) => setEmail(e.target.value)}
            label="Email"
            variant="outlined"
          />
          <StyledMUITextField
            required
            id="adhaarNumber"
            value={adhaarNumber}
            onChange={(e: any) => setAdhaarNumber(e.target.value)}
            label="Adhaar Number"
            variant="outlined"
          />
          <StyledMUITextField
            required
            id="personalContact"
            value={personalContact}
            onChange={(e: any) => setPersonalContact(e.target.value)}
            label="Personal Contact"
            variant="outlined"
          />
          <StyledMUITextField
            required
            id="emergencyContact"
            value={emergencyContact}
            onChange={(e: any) => setEmergencyContact(e.target.value)}
            label="Emergency Contact"
            variant="outlined"
          />

          <StyledMUITextField
            id="uploadedBy"
            className="uploadedBy"
            value={uploadedBy}
            label="Uploaded By"
            disabled
            variant="outlined"
          />
        </div>
        <div className={styles.buttons}>
          <Button>Submit</Button>
          <Button onClick={handleReset} type="button" color="warning">
            Reset
          </Button>
        </div>
      </form>
    </div>
  );
};

//----------------------------------------------User Type: Student

//----------------------------------------------UserCard

interface UserCardProps {
  title: string;
  icon: string;
  description: string;
  onClick: () => void;
}

const UserCard = (props: UserCardProps) => {
  const { title, icon, description, onClick } = props;
  return (
    <div onClick={onClick} className={styles.userCardContainer}>
      <div>
        <p>{title}</p>
        <img src={info} alt="More Info" />
        <div className={styles.moreInfo}>{description}</div>
      </div>
    </div>
  );
};

//----------------------------------------------MUIElements and Styled Components

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

export default Users;
