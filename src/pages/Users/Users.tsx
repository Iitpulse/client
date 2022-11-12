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
import { CurrentContext } from "../../utils/contexts/CurrentContext";
import DownloadIcon from "@mui/icons-material/Download";
import { CSVLink } from "react-csv";
import { flattenUserStudents } from "../../utils";
import MainLayout from "../../layouts/MainLayout";
import { PERMISSIONS } from "../../utils/constants";
import { Add as AddIcon } from "@mui/icons-material";
import { usePermission } from "../../utils/contexts/PermissionsContext";

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
  const isCreatePermitted = usePermission(PERMISSIONS.USER.CREATE);
  const [student, setStudent] = useState<any>(defaultValue);
  const [admin, setAdmin] = useState<any>(defaultValue);
  const [manager, setManager] = useState<any>(defaultValue);
  const [teacher, setTeacher] = useState<any>(defaultValue);
  const [operator, setOperator] = useState<any>(defaultValue);
  const [csvData, setCsvData] = useState<any>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  //For Option Menu
  const [selectedUserType, setSelectedUserType] = useState<string>("");
  const [openModal, setOpenModal] = useState<boolean>(false);

  // function submitHandler(e: React.FormEvent<HTMLFormElement>) {
  //   e.preventDefault();
  // }

  // function handleReset() {
  //   setStudent(defaultValue);
  //   setAdmin(defaultValue);
  //   setManager(defaultValue);
  //   setTeacher(defaultValue);
  //   setOperator(defaultValue);
  // }

  const [tab, setTab] = useState(0);

  const handleChangeTab = (event: React.SyntheticEvent, newValue: number) => {
    setOpenModal(false);
    setTab(newValue);
  };

  function handleCloseModal() {
    setOpenModal(false);
  }

  const {
    fetchStudents,
    fetchTeachers,
    fetchAdmins,
    fetchManagers,
    fetchOperators,
  } = useContext(UsersContext);
  const [loading, setLoading] = useState(false);

  function handleClickRefresh() {
    setLoading(true);
    switch (tab) {
      case 0:
        fetchStudents(() => {
          setLoading(false);
        });
        break;
      case 1:
        fetchTeachers(() => {
          setLoading(false);
        });
        break;
      case 2:
        fetchAdmins(() => {
          setLoading(false);
        });
        break;
      case 3:
        fetchManagers(() => {
          setLoading(false);
        });
        break;
      case 4:
        fetchOperators(() => {
          setLoading(false);
        });
        break;
      default:
        break;
    }
  }

  const { students, teachers, admins, operators, managers } =
    useContext(UsersContext);

  function onClickDownloadCSV() {
    switch (tab) {
      case 0:
        setCsvData(flattenUserStudents(students));
        break;
      case 1:
        setCsvData(teachers);
        break;
      case 2:
        setCsvData(admins);
        break;
      case 3:
        setCsvData(operators);
        break;
      case 4:
        setCsvData(managers);
        break;
    }
  }

  return (
    <MainLayout name="Users">
      <div className={styles.container}>
        <div className={styles.header}>
          <Tabs value={tab} onChange={handleChangeTab}>
            <Tab label="Students" />
            <Tab label="Teachers" />
            <Tab label="Admins" />
            <Tab label="Operators" />
            <Tab label="Managers" />
          </Tabs>
          <div>
            <IconButton className={styles.icons} onClick={handleClickRefresh}>
              <CSVLink
                filename={"Questions.csv"}
                data={csvData}
                asyncOnClick={true}
                onClick={(event: any, done: any) => {
                  onClickDownloadCSV();
                  console.log(csvData);
                  done();
                }}
              >
                <DownloadIcon />
                {/* Export to CSV */}
              </CSVLink>
            </IconButton>
            <IconButton
              className={styles.cacheIcon}
              onClick={handleClickRefresh}
            >
              <CachedIcon />
            </IconButton>
            {isCreatePermitted && (
              <Button
                onClick={() => setOpenModal(!openModal)}
                icon={<AddIcon />}
              >
                Add New
              </Button>
            )}
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
          <Admins
            admin={admin}
            activeTab={tab}
            openModal={openModal}
            handleCloseModal={handleCloseModal}
            loading={loading}
          />
        </TabPanel>
        <TabPanel value={tab} index={3}>
          <Operators
            operator={operator}
            activeTab={tab}
            openModal={openModal}
            handleCloseModal={handleCloseModal}
            loading={loading}
          />
        </TabPanel>

        <TabPanel value={tab} index={4}>
          <Managers
            manager={manager}
            activeTab={tab}
            openModal={openModal}
            handleCloseModal={handleCloseModal}
            loading={loading}
          />
        </TabPanel>
        {/*       
      <Sidebar title="Recent Activity">
          <UserProfile />
        </Sidebar> */}
      </div>
    </MainLayout>
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
