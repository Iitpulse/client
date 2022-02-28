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
  Tabs,
  Tab,
} from "@mui/material";
import { styled } from "@mui/system";
import clsx from "clsx";
import "./Users.css";
import closeIcon from "../../assets/icons/close-circle.svg";
import info from "../../assets/icons/info.svg";
import { StyledMUITextField, UserProps } from "./components";
import Students from "./Students/Students";
import Teachers from "./Teachers/Teachers";
import Managers from "./Managers/Managers";

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

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && children}
    </div>
  );
}

const defaultValue = {
  id: "IITP_TT_ABC12334",
  uploadedBy: "John Doe",
  name: "",
  email: "",
  preparingFor: "",
  adhaarNumber: "",
  personalContact: "",
  emergencyContact: "",
  currentAddress: "",
  permanentAddress: "",
};

const Users = () => {
  // For Modal
  // const id = "IITP_TT_ABC12334";
  // const uploadedBy = "John Doe";
  // const [name, setName] = useState<string>("");
  // const [email, setEmail] = useState<string>("");
  // const [preparingFor, setPreparingFor] = useState<string>("");
  // const [adhaarNumber, setAdhaarNumber] = useState<string>("");
  // const [personalContact, setPersonalContact] = useState<string>("");
  // const [emergencyContact, setEmergencyContact] = useState<string>("");
  // const [currentAddress, setCurrentAddress] = useState<string>("");
  // const [permanentAddress, setPermanentAddress] = useState<string>("");

  const [student, setStudent] = useState<any>(defaultValue);
  const [admin, setAdmin] = useState<any>(defaultValue);
  const [manager, setManager] = useState<any>(defaultValue);
  const [teacher, setTeacher] = useState<any>(defaultValue);
  const [operator, setOperator] = useState<any>(defaultValue);

  //For Option Menu
  const [selectedUserType, setSelectedUserType] = useState<string>("");
  const [openModal, setOpenModal] = useState<boolean>(false);

  function submitHandler(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    //BEFORE SUBMITTING MAKE SURE that you don't send values that are Empty string which are not the part of their respective form

    //After Submitting the form
    // setName("");
    // setEmail("");
    // setPreparingFor("");
    // setAdhaarNumber("");
    // setPermanentAddress("");
    // setCurrentAddress("");
    // setEmergencyContact("");
    // setPersonalContact("");
  }

  function handleReset() {
    setStudent(defaultValue);
    setAdmin(defaultValue);
    setManager(defaultValue);
    setTeacher(defaultValue);
    setOperator(defaultValue);
  }

  const [tab, setTab] = useState(0);

  const handleChangeTab = (event: React.SyntheticEvent, newValue: number) => {
    setTab(newValue);
  };

  function handleCloseModal() {
    setOpenModal(false);
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Tabs value={tab} onChange={handleChangeTab}>
          <Tab label="Students" />
          <Tab label="Teachers" />
          <Tab label="Managers" />
        </Tabs>
        <Button onClick={() => setOpenModal(!openModal)}>Add New</Button>
      </div>
      <TabPanel value={tab} index={0}>
        <Students
          student={student}
          activeTab={tab}
          openModal={openModal}
          handleCloseModal={handleCloseModal}
        />
      </TabPanel>
      <TabPanel value={tab} index={1}>
        <Teachers
          teacher={teacher}
          activeTab={tab}
          openModal={openModal}
          handleCloseModal={handleCloseModal}
        />
      </TabPanel>
      <TabPanel value={tab} index={2}>
        <Managers
          manager={teacher}
          activeTab={tab}
          openModal={openModal}
          handleCloseModal={handleCloseModal}
        />
      </TabPanel>

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

//----------------------------------------------User Type: Admin

const Admin = (props: UserProps) => {};

// const UserCard = (props: UserCardProps) => {
//   const { title, icon, description, onClick } = props;
//   return (
//     <div onClick={onClick} className={styles.userCardContainer}>
//       <div>
//         <p>{title}</p>
//         <img src={info} alt="More Info" />
//         <div className={styles.moreInfo}>{description}</div>
//       </div>
//     </div>
//   );
// };

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
