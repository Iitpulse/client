import { Sidebar, NotificationCard, Button } from "../../components";
import styles from "./Users.module.scss";
import { useContext, useState, useEffect } from "react";
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
import { AuthContext } from "../../utils/auth/AuthContext";
import AddNewStudent from "./Students/AddNewStudent";
import { Button as AntdButton } from "antd";
import { PlusOutlined } from "@ant-design/icons";

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
  const userCtx = useContext(AuthContext);
  const roles = userCtx?.roles;
  let permissions: any = [];
  Object.values(roles).map(
    (role: any) => (permissions = [...permissions, ...role.permissions])
  );
  // let isCreatePermitted = usePermission(PERMISSIONS.USER.CREATE_STUDENT);
  const [isCreatePermitted, setIsCreatePermitted] = useState<boolean>(
    permissions.includes("CREATE_STUDENT")
  );
  const [student, setStudent] = useState<any>(defaultValue);
  const [admin, setAdmin] = useState<any>(defaultValue);
  const [manager, setManager] = useState<any>(defaultValue);
  const [teacher, setTeacher] = useState<any>(defaultValue);
  const [operator, setOperator] = useState<any>(defaultValue);
  const [csvData, setCsvData] = useState<any>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  //For Option Menu
  const [selectedUserType, setSelectedUserType] = useState<string>("");
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

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
  useEffect(() => {
    switch (tab) {
      case 0:
        setIsCreatePermitted(permissions.includes("CREATE_STUDENT"));
        break;
      case 1:
        setIsCreatePermitted(permissions.includes("CREATE_TEACHER"));
        break;
      case 2:
        setIsCreatePermitted(permissions.includes("CREATE_ADMIN"));
        break;
      case 3:
        setIsCreatePermitted(permissions.includes("CREATE_OPERATOR"));
        break;
      case 4:
        setIsCreatePermitted(permissions.includes("CREATE_MANAGER"));
        break;
      default:
        break;
    }
  }, [tab, permissions]);

  const handleChangeTab = (event: React.SyntheticEvent, newValue: number) => {
    setIsDrawerOpen(false);
    setTab(newValue);
  };

  function handleCloseModal() {
    setIsDrawerOpen(false);
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
            {permissions.includes("READ_STUDENT") && <Tab label="Students" />}
            {permissions.includes("READ_TEACHER") && <Tab label="Teachers" />}
            {permissions.includes("READ_ADMIN") && <Tab label="Admins" />}
            {permissions.includes("READ_OPERATOR") && <Tab label="Operators" />}
            {permissions.includes("READ_MANAGER") && <Tab label="Managers" />}
          </Tabs>
          <div>
            <IconButton className={styles.icons} onClick={handleClickRefresh}>
              <CSVLink
                filename={"Questions.csv"}
                data={csvData}
                asyncOnClick={true}
                onClick={(event: any, done: any) => {
                  onClickDownloadCSV();
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
              <>
                {/* <Button
                  onClick={() => setOpenModal(!openModal)}
                  icon={<AddIcon />}
                >
                  Add New
                </Button> */}
                <AntdButton
                  type="primary"
                  onClick={() => setIsDrawerOpen(true)}
                  icon={<PlusOutlined />}
                >
                  New account
                </AntdButton>
              </>
            )}
          </div>
        </div>
        <TabPanel value={tab} index={0}>
          <Students
            student={student}
            activeTab={tab}
            isDrawerOpen={isDrawerOpen}
            setIsDrawerOpen={setIsDrawerOpen}
            handleCloseModal={handleCloseModal}
            loading={loading}
          />
        </TabPanel>
        <TabPanel value={tab} index={1}>
          <Teachers
            teacher={teacher}
            activeTab={tab}
            openModal={isDrawerOpen}
            handleCloseModal={handleCloseModal}
            loading={loading}
          />
        </TabPanel>
        <TabPanel value={tab} index={2}>
          <Admins
            admin={admin}
            activeTab={tab}
            openModal={isDrawerOpen}
            handleCloseModal={handleCloseModal}
            loading={loading}
          />
        </TabPanel>
        <TabPanel value={tab} index={3}>
          <Operators
            operator={operator}
            activeTab={tab}
            openModal={isDrawerOpen}
            handleCloseModal={handleCloseModal}
            loading={loading}
          />
        </TabPanel>

        <TabPanel value={tab} index={4}>
          <Managers
            manager={manager}
            activeTab={tab}
            openModal={isDrawerOpen}
            handleCloseModal={handleCloseModal}
            loading={loading}
          />
        </TabPanel>
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
