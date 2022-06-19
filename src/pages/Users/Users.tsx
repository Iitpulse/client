import { Sidebar, NotificationCard, Button } from "../../components";
import styles from "./Users.module.scss";
import { useContext, useState } from "react";
import { Tabs, Tab, IconButton } from "@mui/material";
import clsx from "clsx";
import "./Users.css";
import closeIcon from "../../assets/icons/close-circle.svg";
import info from "../../assets/icons/info.svg";
import { UserProps } from "./components";
import Students from "./Students/Students";
import Teachers from "./Teachers/Teachers";
import Managers from "./Managers/Managers";
import Operators from "./Operators/Operators";
import Admins from "./Admins/Admins";
import UserProfile from "../../components/UserProfile/UserProfile";
import CachedIcon from "@mui/icons-material/Cached";
import { UsersContext } from "../../utils/contexts/UsersContext";

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

  const { fetchStudents } = useContext(UsersContext);
  const [loading, setLoading] = useState(false);

  function handleClickRefresh() {
    setLoading(true);
    switch (tab) {
      case 0:
        fetchStudents(() => {
          setLoading(false);
        });
        break;
      // case 1:

      default:
        break;
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Tabs value={tab} onChange={handleChangeTab}>
          <Tab label="Students" />
          <Tab label="Teachers" />
          <Tab label="Operators" />
          <Tab label="Admins" />
          <Tab label="Managers" />
        </Tabs>
        <div>
          <IconButton onClick={handleClickRefresh}>
            <CachedIcon />
          </IconButton>
          <Button onClick={() => setOpenModal(!openModal)}>Add New</Button>
        </div>
      </div>
      <TabPanel value={tab} index={0}>
        <Students
          student={student}
          activeTab={tab}
          openModal={openModal}
          handleCloseModal={handleCloseModal}
          loading={loading}
        />
      </TabPanel>
      <TabPanel value={tab} index={1}>
        <Teachers
          teacher={teacher}
          activeTab={tab}
          openModal={openModal}
          handleCloseModal={handleCloseModal}
          loading={loading}
        />
      </TabPanel>
      <TabPanel value={tab} index={2}>
        <Operators
          operator={operator}
          activeTab={tab}
          openModal={openModal}
          handleCloseModal={handleCloseModal}
        />
      </TabPanel>

      <TabPanel value={tab} index={3}>
        <Admins
          admin={admin}
          activeTab={tab}
          openModal={openModal}
          handleCloseModal={handleCloseModal}
        />
      </TabPanel>
      <TabPanel value={tab} index={4}>
        <Managers
          manager={manager}
          activeTab={tab}
          openModal={openModal}
          handleCloseModal={handleCloseModal}
        />
      </TabPanel>

      <Sidebar title="Recent Activity">
        <UserProfile />
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

export default Users;

export interface DataType {
  key: React.Key;
  id: string;
  name: string;
  branch: string;
}

export const rowSelection = {
  onChange: (selectedRowKeys: React.Key[], selectedRows: DataType[]) => {
    console.log(
      `selectedRowKeys: ${selectedRowKeys}`,
      "selectedRows: ",
      selectedRows
    );
  },
  getCheckboxProps: (record: DataType) => ({
    disabled: record.name === "Disabled User", // Column configuration not to be checked
    name: record.name,
  }),
};
