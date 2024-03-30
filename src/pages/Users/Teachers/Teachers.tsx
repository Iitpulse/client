import { StyledMUITextField, UserProps } from "../components";
import styles from "./Teachers.module.scss";
import { CustomTable, Sidebar, UserProfile } from "../../../components";
import { useContext, useEffect, useRef, useState } from "react";
import { AuthContext } from "../../../utils/auth/AuthContext";
import { APIS } from "../../../utils/constants";
import {
  Input,
  Space,
  Table,
  Button as AntButton,
  Popconfirm,
  message,
  Tag,
} from "antd";
import { DataType, rowSelection } from "../Users";
import { UsersContext } from "../../../utils/contexts/UsersContext";
import AddUserModal from "../components/AddUserModal";

import Highlighter from "react-highlight-words";
// import type { InputRef } from 'antd';
import type { ColumnsType, ColumnType } from "antd/lib/table";
import type { FilterConfirmProps } from "antd/lib/table/interface";
import { Grid, IconButton } from "@mui/material";
import { EyeFilled, SearchOutlined } from "@ant-design/icons";
import { API_USERS } from "../../../utils/api/config";
import { Edit } from "@mui/icons-material";
import deleteIcon from "../../../assets/icons/delete.svg";
import { useTestContext } from "../../../utils/contexts/TestContext";
import AddNewTeacher from "./AddNewTeacher";
import { CurrentContext } from "../../../utils/contexts/CurrentContext";

const Teachers: React.FC<{
  activeTab: number;
  teacher: UserProps;
  openModal: boolean;
  isDrawerOpen: boolean;
  setIsDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleCloseModal: () => void;
  loading: boolean;
}> = ({
  activeTab,
  teacher,
  isDrawerOpen,
  setIsDrawerOpen,
  openModal,
  handleCloseModal,
  loading,
}) => {
  const [searchText, setSearchText] = useState("");
  const [edit, setEdit] = useState<any>(false);
  const [searchedColumn, setSearchedColumn] = useState("");
  const [current, setCurrent] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const searchInput = useRef<any>(null);

  const { selectedUsers, setSelectedUsers } = useContext(CurrentContext);

  const handleSearch = (
    selectedKeys: string[],
    confirm: (param?: FilterConfirmProps) => void,
    dataIndex: any
  ) => {
    confirm();
    setSearchText(selectedKeys[0]);
    setSearchedColumn(dataIndex);
  };

  const handleReset = (clearFilters: () => void) => {
    clearFilters();
    setSearchText("");
  };

  const getColumnSearchProps = (dataIndex: any): ColumnType<DataType> => ({
    filterDropdown: ({
      setSelectedKeys,
      selectedKeys,
      confirm,
      clearFilters,
    }) => (
      <div style={{ padding: 8 }}>
        <Input
          ref={searchInput}
          placeholder={`Search ${dataIndex}`}
          value={selectedKeys[0]}
          onChange={(e) =>
            setSelectedKeys(e.target.value ? [e.target.value] : [])
          }
          onPressEnter={() =>
            handleSearch(selectedKeys as string[], confirm, dataIndex)
          }
          style={{ marginBottom: 8, display: "block" }}
        />
        <Space>
          <AntButton
            type="primary"
            onClick={() =>
              handleSearch(selectedKeys as string[], confirm, dataIndex)
            }
            icon={<SearchOutlined />}
            size="small"
            style={{ width: 90 }}
          >
            Search
          </AntButton>
          <AntButton
            onClick={() => clearFilters && handleReset(clearFilters)}
            size="small"
            style={{ width: 90 }}
          >
            Reset
          </AntButton>
          <AntButton
            type="link"
            size="small"
            onClick={() => {
              confirm({ closeDropdown: false });
              setSearchText((selectedKeys as string[])[0]);
              setSearchedColumn(dataIndex);
            }}
          >
            Filter
          </AntButton>
        </Space>
      </div>
    ),
    filterIcon: (filtered: boolean) => (
      <SearchOutlined style={{ color: filtered ? "#1890ff" : undefined }} />
    ),
    onFilter: (value: any, record: any) =>
      record[dataIndex]
        .toString()
        .toLowerCase()
        .includes((value as string).toLowerCase()),
    onFilterDropdownVisibleChange: (visible: boolean) => {
      if (visible) {
        setTimeout(() => searchInput.current?.select(), 100);
      }
    },
    render: (text: string) =>
      searchedColumn === dataIndex ? (
        <Highlighter
          highlightStyle={{ backgroundColor: "#ffc069", padding: 0 }}
          searchWords={[searchText]}
          autoEscape
          textToHighlight={text ? text.toString() : ""}
        />
      ) : (
        text
      ),
  });
  const columns: any = [
    {
      title: "View",
      dataIndex: "view",
      key: "view",
      width: 80,
      fixed: "left",
      render: (text: any, record: any) => (
        <IconButton
          onClick={() => {
            setIsSidebarOpen(true);
            setCurrent(record);
          }}
        >
          <EyeFilled />
        </IconButton>
      ),
    },
    {
      title: "Name",
      dataIndex: "name",
      width: 200,
      render: (text: string) => (
        <span style={{ overflow: "ellipsis", minWidth: "300px" }}>{text}</span>
      ),
      ...getColumnSearchProps("name"),
    },
    {
      title: "Email",
      dataIndex: "email",
      width: "20%",
      ...getColumnSearchProps("email"),
    },
    {
      title: "Contact",
      dataIndex: "contact",
      ...getColumnSearchProps("contact"),
    },
    {
      title: "Gender",
      dataIndex: "gender",
      filters: [
        {
          text: "Male",
          value: "male",
        },
        {
          text: "Female",
          value: "female",
        },
      ],
      onFilter: (value: any, record: any) =>
        record.gender?.indexOf(value) === 0,
      render: (text: string) => (
        <span style={{ textTransform: "capitalize" }}>{text}</span>
      ),
    },
    {
      title: "Institute",
      dataIndex: "institute",
      ...getColumnSearchProps("institute"),

      // width: 200,
    },
    {
      title: "Subject",
      dataIndex: "subjects",
      render: (subjects: Array<Object>) => (
        <div>
          {subjects?.length > 0 &&
            subjects.map((subject: any) => (
              <Tag style={{ textTransform: "capitalize", margin: "2px" }}>
                {" "}
                {subject.name}
              </Tag>
            ))}
        </div>
      ),

      // width: 200,
    },
    // {
    //   title: "Batch",
    //   dataIndex: "batch",
    //   // width: 100,
    //   render: (text: string) => (
    //     <span style={{ textTransform: "capitalize" }}> {text}</span>
    //   ),
    // },
    {
      title: "Valid From",
      dataIndex: "validity",
      // width: 100,
      render: (obj: any) => (
        <span>{new Date(obj.from).toLocaleDateString()}</span>
      ),
    },
    {
      title: "Valid Till",
      dataIndex: "validity",
      // width: 100,
      render: (obj: any) => (
        <span>{new Date(obj.to).toLocaleDateString()}</span>
      ),
    },
  ];

  const { teachers, fetchTeachers } = useContext(UsersContext);

  const deleteUser = async () => {
    console.log(current);
    try {
      const res = await API_USERS().delete(`/teacher/${current?._id}`);
      console.log({ res });
      if (res.status === 200) {
        setIsSidebarOpen(false);
        fetchTeachers();
        message.success("Teacher deleted successfully");
      }
    } catch (error) {
      console.log({ error });
      message.error("Error deleting Teacher");
    }
  };
  return (
    <div className={styles.container}>
      <CustomTable
        selectedRows={selectedUsers}
        setSelectedRows={setSelectedUsers}
        selectable={true}
        columns={columns}
        dataSource={teachers as any}
        loading={loading}
        scroll={{ x: 100 }}
      />
      {!edit && (
        <AddNewTeacher
          open={isDrawerOpen}
          setOpen={setIsDrawerOpen}
          teacher={teacher}
          title="Add a Teacher"
          handleCloseModal={handleCloseModal}
        />
      )}
      {edit && (
        <AddNewTeacher
          edit={true}
          current={current}
          open={isDrawerOpen}
          setOpen={() => {
            setIsDrawerOpen(false);
            setEdit(false);
          }}
          teacher={teacher}
          title="Edit a Teacher"
          handleCloseModal={handleCloseModal}
        />
      )}
      <Sidebar
        title="User Details"
        open={isSidebarOpen}
        width={"25%"}
        handleClose={() => setIsSidebarOpen(false)}
        extra={
          <div className={styles.flexRow}>
            <IconButton
              onClick={() => {
                setEdit(true);
                setIsDrawerOpen(true);
                setIsSidebarOpen(false);
              }}
            >
              <Edit />
            </IconButton>
            <Popconfirm title="Sure to delete?" onConfirm={deleteUser}>
              <IconButton>
                <img src={deleteIcon} alt="Delete" />
              </IconButton>
            </Popconfirm>
          </div>
        }
      >
        <UserProfile
          user={current}
          handleDeleteModal={() => {}}
          handleEditModal={() => {}}
        />
      </Sidebar>
      {/* {openModal && activeTab === 1 && (
        <Teacher teacher={teacher} handleCloseModal={handleCloseModal} />
      )} */}
    </div>
  );
};

export default Teachers;

// const Teacher: React.FC<{
//   teacher: UserProps;
//   handleCloseModal: () => void;
// }> = (props) => {
//   const { uploadedBy, handleReset } = props.teacher;

//   const newUserRef = useRef<HTMLFormElement>(null);
//   const [values, setValues] = useState({} as any);
//   const [roles, setRoles] = useState([
//     {
//       name: "Teacher",
//       value: "ROLE_TEACHER",
//     },
//   ]);

//   const [success, setSuccess] = useState("");

//   const [loading, setLoading] = useState(false);
//   const [rolesInfo, setRolesInfo] = useState({
//     options: [],
//     actual: [],
//   });
//   const [subjects, setSubjects] = useState([]);
//   const [error, setError] = useState("");
//   const [helperTextObj, setHelperTextObj] = useState({
//     name: {
//       error: false,
//       helperText: "",
//     },
//     email: {
//       error: false,
//       helperText: "",
//     },
//     stream: {
//       error: false,
//       helperText: "",
//     },
//     standard: {
//       error: false,
//       helperText: "",
//     },
//     gender: {
//       error: false,
//       helperText: "",
//     },

//     dob: {
//       error: false,
//       helperText: "",
//     },
//     batch: {
//       error: false,
//       helperText: "",
//     },
//     roles: {
//       error: false,
//       helperText: "",
//     },
//     contact: {
//       error: false,
//       helperText: "",
//     },
//     emergencyContact: {
//       error: false,
//       helperText: "",
//     },
//     aadhaar: {
//       error: false,
//       helperText: "",
//     },
//   });
//   const { currentUser } = useContext(AuthContext);
//   const { subjects: globalSubjects } = useTestContext();

//   function handleChangeValues(e: React.ChangeEvent<HTMLInputElement>) {
//     const { id, value } = e.target;
//     console.log({ id, value });
//     setValues({ ...values, [id]: value });
//   }

//   async function handleSubmit(e: React.MouseEvent<HTMLButtonElement>) {
//     e.preventDefault();
//     message.loading("Creating User...", 0);
//     try {
//       let newValues = { ...values };
//       newValues.subjects = subjects?.map((subject: any) => ({
//         id: subject._id,
//         name: subject.name,
//       }));
//       newValues.userType = "teacher";
//       newValues.createdBy = {
//         id: currentUser?.id,
//         userType: currentUser?.userType,
//       };
//       newValues.institute = currentUser?.instituteId;
//       newValues.roles = [
//         {
//           id: "ROLE_TEACHER",
//           from: new Date().toISOString(),
//           to: new Date().toISOString(),
//         },
//       ];
//       newValues.createdAt = new Date().toISOString();
//       newValues.modifiedAt = new Date().toISOString();
//       newValues.previousTests = [];
//       newValues.validity = {
//         from: new Date().toISOString(),
//         to: new Date().toISOString(),
//       };

//       const res = await API_USERS().post(`/teacher/create`, newValues);
//       message.destroy();
//       message.success("Teacher Created Successfully");
//     } catch (error) {
//       message.destroy();
//       message.error("Error Creating Teacher");
//     }
//   }

//   const userCtx = useContext(AuthContext);

//   const rolesAllowed = userCtx?.roles;
//   let permissions: any = [];
//   Object.values(rolesAllowed).map(
//     (role: any) => (permissions = [...permissions, ...role.permissions])
//   );

//   useEffect(() => {
//     async function getRolesOption() {
//       const res = await API_USERS().get(`/roles/all`);
//       const roleMap: any = {
//         ROLE_STUDENT: "CREATE_STUDENT",
//         ROLE_TEACHER: "CREATE_TEACHER",
//         ROLE_ADMIN: "CREATE_ADMIN",
//         ROLE_OPERATOR: "CREATE_OPERATOR",
//         ROLE_MANAGER: "CREATE_MANAGER",
//       };
//       setRolesInfo((prev: any) => ({
//         ...prev,
//         options: res.data
//           .map((item: any) => ({
//             name: item.name,
//             value: item.id,
//           }))
//           .filter((data: any) => {
//             return permissions.includes("CREATE_" + data.value.slice(5));
//           }),
//         actual: res.data,
//       }));
//     }
//     getRolesOption();
//   }, []);
//   return (
//     <div className={clsx(styles.studentContainer, styles.modal)}>
//       <AddUserModal
//         title="Add a Teacher"
//         actionBtns={
//           <>
//             <Button onClick={handleReset} type="button" color="warning">
//               Reset
//             </Button>
//             <Button type="submit" onClick={handleFormSubmit}>
//               Submit
//             </Button>
//           </>
//         }
//         classes={[styles.studentContainer]}
//         // loading={loading}
//         // success={succ}
//         // error={error}
//         handleCloseModal={props.handleCloseModal}
//       >
//         <form ref={newUserRef} onSubmit={handleSubmit}>
//           <div className={styles.inputFields}>
//             <Grid container spacing={2}>
//               <Grid item xs={12} md={4} lg={4} xl={3}>
//                 <StyledMUITextField
//                   id="name"
//                   required
//                   label="Name"
//                   value={values.name}
//                   onChange={handleChangeValues}
//                   variant="outlined"
//                   error={helperTextObj?.name?.error}
//                 />
//               </Grid>
//               <Grid item xs={12} md={4} lg={4} xl={3}>
//                 <StyledMUITextField
//                   required
//                   id="email"
//                   type="email"
//                   value={values.email}
//                   onChange={handleChangeValues}
//                   label="Email"
//                   variant="outlined"
//                   error={helperTextObj?.email?.error}
//                 />
//               </Grid>
//               <Grid item xs={12} md={4} lg={4} xl={3}>
//                 <StyledMUITextField
//                   required
//                   id="password"
//                   value={values.password}
//                   type="password"
//                   onChange={handleChangeValues}
//                   label="Password"
//                   variant="outlined"
//                 />
//               </Grid>
//               <Grid item xs={12} md={4} lg={4} xl={3}>
//                 <StyledMUITextField
//                   required
//                   id="dob"
//                   type="text"
//                   value={values.dob}
//                   onChange={handleChangeValues}
//                   label="DOB"
//                   placeholder="DD/MM/YYYY"
//                   variant="outlined"
//                   error={helperTextObj?.dob?.error}
//                 />
//               </Grid>
//               <Grid item xs={12} md={4} lg={4} xl={3}>
//                 <StyledMUITextField
//                   required
//                   id="aadhaar"
//                   type="text"
//                   value={values.aadhaar}
//                   onChange={handleChangeValues}
//                   label="Aadhaar Number"
//                   placeholder="Enter Aadhaar Number"
//                   variant="outlined"
//                   error={helperTextObj?.aadhaar?.error}
//                 />
//               </Grid>
//               <Grid item xs={12} md={4} lg={4} xl={3}>
//                 <StyledMUITextField
//                   required
//                   id="contact"
//                   type="number"
//                   value={values.contact}
//                   onChange={handleChangeValues}
//                   label="Contact"
//                   variant="outlined"
//                   error={helperTextObj?.contact?.error}
//                 />
//               </Grid>

//               <Grid item xs={12} md={4} lg={4} xl={3}>
//                 <MUISimpleAutocomplete
//                   label="Gender"
//                   onChange={(val: any) => {
//                     console.log({ val });
//                     handleChangeValues({
//                       target: { id: "gender", value: val },
//                     } as any);
//                   }}
//                   options={[
//                     { name: "Male", value: "male" },
//                     { name: "Female", value: "female" },
//                     { name: "Other", value: "other" },
//                   ]}
//                   value={values.gender}
//                 />
//               </Grid>
//               <Grid item xs={12} md={4} lg={4} xl={3}>
//                 <StyledMUITextField
//                   required
//                   id="city"
//                   type="text"
//                   value={values.city}
//                   onChange={handleChangeValues}
//                   label="City"
//                   placeholder="Enter a City"
//                   variant="outlined"
//                 />
//               </Grid>
//               <Grid item xs={12} md={4} lg={4} xl={3}>
//                 <StyledMUITextField
//                   required
//                   id="state"
//                   type="text"
//                   value={values.state}
//                   onChange={handleChangeValues}
//                   label="State"
//                   placeholder="Enter a State"
//                   variant="outlined"
//                 />
//               </Grid>
//               <Grid item xs={12} md={4} lg={4} xl={3}>
//                 <StyledMUITextField
//                   required
//                   id="emergencyContact"
//                   type="number"
//                   value={values.emergencyContact}
//                   error={helperTextObj?.emergencyContact?.error}
//                   onChange={handleChangeValues}
//                   label="Emergency Contact"
//                   variant="outlined"
//                 />
//               </Grid>
//               <Grid item xs={12} md={8} lg={8} xl={4}>
//                 <MUIChipsAutocomplete
//                   label="Subject(s)"
//                   options={globalSubjects}
//                   onChange={setSubjects}
//                   value={subjects}
//                 />
//               </Grid>
//             </Grid>
//             <Grid container spacing={2}>
//               <Grid item xs={12} md={12} lg={12} xl={8}>
//                 <MUIChipsAutocomplete
//                   label="Role(s)"
//                   options={rolesInfo?.options}
//                   onChange={setRoles}
//                   value={roles}
//                 />
//               </Grid>
//               {/* <Grid item xs={12} md={12} lg={12} xl={8}>
//                 <StyledMUITextField
//                   required
//                   className="largeWidthInput"
//                   id="currentAddress"
//                   value={values.currentAddress}
//                   onChange={handleChangeValues}
//                   label="Current Address"
//                   variant="outlined"
//                 />
//               </Grid>
//               <Grid item xs={12} md={12} lg={12} xl={8}>
//                 <StyledMUITextField
//                   required
//                   className="largeWidthInput"
//                   id="permanentAddress"
//                   value={values.permanentAddress}
//                   onChange={handleChangeValues}
//                   label="Permanent Address"
//                   variant="outlined"
//                 />
//               </Grid> */}
//             </Grid>

//             {/* <StyledMUITextField
//             required
//             id="emergencyContact"
//             value={emergencyContact}
//             onChange={(e: any) => setEmergencyContact(e.target.value)}
//             label="Emergency Contact"
//             variant="outlined"
//           /> */}
//           </div>
//           {/* <div className={styles.buttons}>
//           <Button onClick={handleReset} type="button" color="warning">
//             Reset
//           </Button>
//           <Button>Submit</Button>
//         </div> */}
//         </form>
//       </AddUserModal>
//     </div>
//   );
// };
