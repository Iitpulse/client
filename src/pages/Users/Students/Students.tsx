import { useCallback, useContext, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import {
  Button,
  MUIChipsAutocomplete,
  MUISimpleAutocomplete,
  Sidebar,
  UserProfile,
  Modal,
  CustomTable,
} from "../../../components";
import {
  StyledMUITextField,
  UserProps,
  MUICreatableSelect,
} from "../components";
import styles from "./Students.module.scss";
import {
  Input,
  Space,
  Table,
  Button as AntButton,
  message,
  Popconfirm,
} from "antd";
import { AuthContext } from "../../../utils/auth/AuthContext";
import axios from "axios";
import Dropzone from "react-dropzone";
import {
  IconButton,
  LinearProgress,
  Grid,
  FormHelperText,
  TextField,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { UsersContext } from "../../../utils/contexts/UsersContext";
import { CurrentContext } from "../../../utils/contexts/CurrentContext";
import AddUserModal from "../components/AddUserModal";
import { ColumnType } from "antd/lib/table";
import { FilterConfirmProps } from "antd/lib/table/interface";
import { EyeFilled, SearchOutlined } from "@ant-design/icons";
import Highlighter from "react-highlight-words";
import { API_USERS } from "../../../utils/api/config";
import { DeleteOutline, Edit } from "@mui/icons-material";
import AddNewStudent from "./AddNewStudent";

const Students: React.FC<{
  activeTab: number;
  student: UserProps;
  isDrawerOpen: boolean;
  setIsDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleCloseModal: () => void;
  loading: boolean;
}> = ({
  activeTab,
  student,
  isDrawerOpen,
  setIsDrawerOpen,
  handleCloseModal,
  loading,
}) => {
  const { students, fetchStudents } = useContext(UsersContext);
  const [currentStudent, setCurrentStudent] = useState<any>(null);
  const [edit, setEdit] = useState<any>(false);
  const [searchText, setSearchText] = useState("");
  const [searchedColumn, setSearchedColumn] = useState("");
  const searchInput = useRef<any>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const { setSelectedUsers, selectedUsers } = useContext(CurrentContext);

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
            setCurrentStudent(record);
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
      fixed: "left",
      render: (text: string) => (
        <span style={{ overflow: "ellipsis" }}>{text}</span>
      ),
      ...getColumnSearchProps("name"),
    },
    {
      title: "Contact",
      dataIndex: "contact",
      width: 150,
      ...getColumnSearchProps("contact"),
    },
    {
      title: "School",
      dataIndex: "school",
      width: 150,
      ...getColumnSearchProps("school"),
      render: (school: string) => (
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            width: "100%",
            display: "inline-block",
          }}
        >
          {school}
        </span>
      ),
    },
    {
      title: "Gender",
      dataIndex: "gender",
      width: 100,
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
    // {
    //   title: "Batch",
    //   dataIndex: "batch",
    //   // width: 100,
    //   render: (text: string) => (
    //     <span style={{ textTransform: "capitalize" }}> {text}</span>
    //   ),
    // },
    {
      title: "Batch",
      dataIndex: "batch",
      width: 100,
      render: (text: string) => (
        <span style={{ textTransform: "capitalize" }}> {text}</span>
      ),
      ...getColumnSearchProps("batch"),
    },
    {
      title: "Class",
      dataIndex: "standard",
      ...getColumnSearchProps("standard"),
      width: 50,
    },
    {
      title: "City",
      dataIndex: "city",
      width: 100,
      ...getColumnSearchProps("city"),
      render: (text: string) => (
        <span style={{ textTransform: "capitalize" }}>{text}</span>
      ),
    },
    {
      title: "Valid From",
      dataIndex: "validity",
      width: 150,
      render: (obj: any) => (
        <span>{new Date(obj.from).toLocaleDateString()}</span>
      ),
    },
    {
      title: "Valid Till",
      dataIndex: "validity",
      width: 150,
      render: (obj: any) => (
        <span>{new Date(obj.to).toLocaleDateString()}</span>
      ),
    },
  ];

  interface DataType {
    key: React.Key;
    id: string;
    name: string;
    branch: string;
  }

  const deleteUser = async () => {
    try {
      const res = await API_USERS().delete(`/student/${currentStudent?.id}`);
      console.log({ res });
      if (res.status === 200) {
        setIsSidebarOpen(false);
        fetchStudents();
        message.success("Student deleted successfully");
      }
    } catch (error) {
      console.log({ error });
      message.error("Error deleting student");
    }
  };
  return (
    <div className={styles.container}>
      <CustomTable
        selectedRows={selectedUsers}
        setSelectedRows={setSelectedUsers}
        selectable={true}
        columns={columns}
        dataSource={students}
        loading={loading}
        scroll={{ x: 200, y: "50vh" }}
      />

      {!edit && activeTab === 0 && (
        <AddNewStudent
          edit={false}
          current={null}
          open={isDrawerOpen}
          setOpen={setIsDrawerOpen}
          student={student}
          title="Add a Student"
          handleCloseModal={handleCloseModal}
        />
      )}
      {edit && activeTab === 0 && (
        <AddNewStudent
          edit={true}
          current={currentStudent}
          open={isDrawerOpen}
          setOpen={() => {
            setEdit(false);
            setIsDrawerOpen(false);
          }}
          student={student}
          title="Edit a Student"
          handleCloseModal={() => {
            setEdit(false);
            handleCloseModal();
          }}
        />
      )}

      {isEditModalOpen && (
        <Student
          title="Edit a Student"
          edit={{ values: selectedUsers[0] }}
          handleCloseModal={() => setIsEditModalOpen(false)}
        />
      )}
      <Sidebar
        title=""
        open={isSidebarOpen}
        width={"25%"}
        handleClose={() => setIsSidebarOpen(false)}
        extra={
          <div className={styles.flexRow}>
            <IconButton
              onClick={() => {
                setEdit(true);
                console.log({ currentStudent });
                setIsDrawerOpen(true);
                setIsSidebarOpen(false);
              }}
            >
              <Edit />
            </IconButton>
            <Popconfirm title="Sure to delete?" onConfirm={deleteUser}>
              <IconButton>
                <DeleteOutline />
                {/* <img src={deleteIcon} alt="Delete" /> */}
              </IconButton>
            </Popconfirm>
          </div>
        }
      >
        <UserProfile
          user={currentStudent}
          handleDeleteModal={() => {}}
          handleEditModal={() => {}}
        />
      </Sidebar>

      {/* <Sidebar title="Recent Activity">
        <UserProfile
          handleEditModal={() => setIsEditModalOpen(true)}
          handleDeleteModal={() => setIsDeleteModalOpen(true)}
        />
      </Sidebar> */}
    </div>
  );
};

export default Students;
const defaultValue = {
  name: "",
  password: "",
  email: "",
  stream: "",
  standard: "",
  batch: "",
  gender: "",
  roles: "",
  contact: "",
  parentContact: "",
  aadhaar: "",
  school: "",
  dob: "",
  city: "",
  state: "",
  parentName: "",
  currentAddress: "",
  permanentAddress: "",
};
export const Student: React.FC<{
  student?: UserProps;
  title?: string;
  handleCloseModal: () => void;
  edit?: {
    values: any;
  };
}> = (props) => {
  const { onSubmit, uploadedBy } = { ...props.student };
  const [values, setValues] = useState(defaultValue as any);
  const newUserRef = useRef<HTMLFormElement>(null);
  const [openDropzne, setOpenDropzone] = useState(false);
  const [file, setFile] = useState(null as any);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [rolesInfo, setRolesInfo] = useState({
    options: [],
    actual: [],
  });
  const [batches, setBatches] = useState([]);

  const [error, setError] = useState("");

  const [helperTextObj, setHelperTextObj] = useState({
    email: {
      error: false,
      helperText: "",
    },
    stream: {
      error: false,
      helperText: "",
    },
    standard: {
      error: false,
      helperText: "",
    },
    gender: {
      error: false,
      helperText: "",
    },

    dob: {
      error: false,
      helperText: "",
    },
    batch: {
      error: false,
      helperText: "",
    },
    roles: {
      error: false,
      helperText: "",
    },
    aadhaar: {
      error: false,
      helperText: "",
    },
    contact: {
      parent: {
        error: false,
        helperText: "",
      },
      personal: {
        error: false,
        helperText: "",
      },
    },
  });
  const [roles, setRoles] = useState([
    { name: "STUDENT", value: "ROLE_STUDENT" },
  ]);
  console.log({ roles });
  const { currentUser } = useContext(AuthContext);
  useEffect(() => {
    async function fetchBatch() {
      setLoading(true);
      try {
        const res = await API_USERS().get(`/batch/get`);
        console.log({ res });
        setBatches(res?.data);
      } catch (error) {
        console.log("ERROR_FETCH_BATCH", error);
        message.error("Error fetching batch");
      }
      setLoading(false);
    }

    if (currentUser?.id) {
      fetchBatch();
    }
  }, [currentUser]);
  let optionsForBatch = batches.map((item: any) => ({
    ...item,
    value: item.id,
    label: item.name,
  }));
  function handleChangeValues(e: React.ChangeEvent<HTMLInputElement>) {
    const { id, value } = e.target;
    setValues({ ...values, [id]: value });
  }
  useEffect(() => {
    if (props.edit) {
      setValues(props.edit.values);
    }
  });

  function handleReset() {
    setValues(defaultValue);
    setRoles([]);
  }
  function handleChangeValuesForCreatableSelect(
    e: React.ChangeEvent<HTMLInputElement>,
    value: any
  ) {
    const { id } = e.target;
    const newId = id.split("-option").shift();
    setValues({ ...values, [newId ? newId : id]: value });
  }

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      if (!newUserRef.current?.reportValidity()) return;
      e.preventDefault();
      message.loading("Creating Student User...", 0);
      try {
        const error = {
          stream: !Boolean(values.stream),
          standard: !Boolean(values.standard),
          batch: !Boolean(values.batch),
          gender: !Boolean(values.gender),
          roles: !(values.roles?.length > 0),
          contact: {
            parent: values.parentContact?.length !== 10,
            personal: values.contact?.length !== 10,
          },
          aadhaar: values.aadhaar?.length !== 12,
        };
        console.log(error);
        if (
          error.stream ||
          error.standard ||
          error.batch ||
          error.gender ||
          error.roles ||
          error.contact.parent ||
          error.contact.personal ||
          error.aadhaar
        ) {
          if (error.stream) {
            setHelperTextObj((prev) => ({
              ...prev,
              stream: { error: true, helperText: "Please select a Stream" },
            }));
          }

          if (error.standard) {
            setHelperTextObj((prev) => ({
              ...prev,
              standard: { error: true, helperText: "Please select a Standard" },
            }));
          }

          if (error.batch) {
            setHelperTextObj((prev) => ({
              ...prev,
              batch: { error: true, helperText: "Please select a Batch" },
            }));
          }

          if (error.roles) {
            setHelperTextObj((prev) => ({
              ...prev,
              roles: { error: true, helperText: "Please select a Roles" },
            }));
          }
          if (error.aadhaar) {
            setHelperTextObj((prev) => ({
              ...prev,
              aadhaar: {
                error: true,
                helperText: "Please enter a valid aadhar number",
              },
            }));
          }
          if (error.contact.parent) {
            setHelperTextObj((prev) => ({
              ...prev,
              contact: {
                ...prev.contact,
                parent: {
                  error: true,
                  helperText: "Please enter a valid contact number",
                },
              },
            }));
          }
          if (error.contact.personal) {
            setHelperTextObj((prev) => ({
              ...prev,
              contact: {
                ...prev.contact,
                personal: {
                  error: true,
                  helperText: "Please enter a valid contact number",
                },
              },
            }));
          }
          if (error.gender) {
            setHelperTextObj((prev) => ({
              ...prev,
              gender: { error: true, helperText: "Please select a Gender" },
            }));
          }

          return;
        }
        setLoading(true);
        setError("");
        setSuccess("");
        // if (values.parentContact?.length !== 10) {
        //   setLoading(false);
        //   setHelperTextObj((prev) => ({
        //     ...prev,
        //     contact: {
        //       ...prev.contact,
        //       parent: { ...prev.contact.parent, error: true },
        //     },
        //   }));
        //   return alert("Parent Contact must be 10 digits long");
        // }
        // if (!values.gender) {
        //   setLoading(false);
        //   setHelperTextObj((prev) => ({
        //     ...prev,
        //     gender: { ...prev?.gender, error: true },
        //   }));
        //   return alert("Select a gender");
        // }

        let newValues = { ...values };
        newValues.parentDetails = {
          name: newValues.parentName,
          contact: newValues.parentContact,
        };
        delete newValues.parentName;
        delete newValues.parentContact;
        newValues.email = newValues.email.toLowerCase();
        newValues.userType = "student";
        newValues.createdBy = {
          id: currentUser?.id,
          userType: currentUser?.userType,
        };
        newValues.confirmPassword = newValues.password;
        newValues.institute = currentUser?.instituteId;
        newValues.standard = parseInt(values?.standard?.value);
        newValues.batch = values?.batch?.name;
        console.log({ jc: values?.batch });
        newValues.promoCode = values?.batch?.promoCode;
        newValues.roles = roles
          ?.filter((role: any) =>
            rolesInfo?.actual?.find((roleInfo: any) => {
              return roleInfo?.id === role?.value;
            })
          )
          .map((role: any) => role?.value);
        newValues.createdAt = new Date().toISOString();
        newValues.modifiedAt = new Date().toISOString();

        newValues.stream = values?.stream?.value;

        // console.log({ newValues });
        const res = await API_USERS().post(`/student/create`, newValues);
        // console.log({ res });
        if (res.status === 200) {
          message.success("Student created successfully");
          handleReset();
        }
        setSuccess("Student created successfully");
        message.destroy();
        message.success("Student created successfully");
      } catch (error: any) {
        setError(error.response.data.message);
        message.destroy();
        message.error(error.response.data.message);
        if (error.response.data.message.includes("email")) {
          setHelperTextObj((prev) => ({
            ...prev,
            email: {
              ...prev?.email,
              error: true,
              helperText: error.response.data.message,
            },
          }));
        }
      }
      setLoading(false);
      // handleReset();
    },
    [newUserRef, values, currentUser, rolesInfo, roles]
  );

  function handleFormSubmit() {
    if (newUserRef?.current) {
      newUserRef.current.dispatchEvent(
        new Event("submit", { cancelable: true, bubbles: true })
      );
    }
  }
  useEffect(() => {
    setValues((prev: any) => ({ ...prev, roles }));
  }, [roles]);
  async function handleUploadFile() {
    if (currentUser) {
      setLoading(true);
      const formData = new FormData();
      formData.append("file", file);
      // formData.append("name", file?.name);
      formData.append(
        "createdBy",
        JSON.stringify({
          id: currentUser?.id,
          userType: currentUser?.userType,
        })
      );

      const bulkRes = await API_USERS().post(`/student/bulk`, formData);

      if (bulkRes.status === 200) {
        setFile(null);
        alert("File uploaded successfully");
      } else {
        alert("File upload failed");
      }
    }
    setLoading(false);
  }
  let optionsForStream = [
    { name: "PCM", value: "PCM" },
    { name: "PCB", value: "PCB" },
    { name: "PCMB", value: "PCMB" },
    { name: "Commerce", value: "commerce" },
    { name: "Arts", value: "arts" },
  ];
  let optionsForStandard = [
    { name: "11th", value: "11" },
    { name: "12th", value: "12" },
    { name: "Dropper", value: "13" },
  ];

  const userCtx = useContext(AuthContext);

  // console.log(userCtx);
  const rolesAllowed = userCtx?.roles;

  let permissions: any = [];
  Object.values(rolesAllowed).map(
    (role: any) => (permissions = [...permissions, ...role.permissions])
  );
  // console.log(permissions);
  useEffect(() => {
    async function getRolesOption() {
      const res = await API_USERS().get(`/roles/all`);

      console.log({ res: res.data });
      setRolesInfo((prev: any) => ({
        ...prev,
        options: res.data
          .map((item: any) => ({
            name: item.name,
            value: item.id,
          }))
          .filter((data: any) => {
            return permissions.includes("CREATE_" + data.value.slice(5));
          }),
        actual: res.data,
      }));
    }
    getRolesOption();
  }, []);

  return (
    // <div className={clsx(styles.studentContainer, styles.modal)}>
    <AddUserModal
      headerChildren={
        <>
          {props.edit ? (
            ""
          ) : (
            <Button type="button" onClick={() => setOpenDropzone(true)}>
              Bulk Upload
            </Button>
          )}
        </>
      }
      classes={[styles.studentContainer]}
      loading={loading}
      error={error}
      success={success}
      title={props.title || "Add a Student"}
      actionBtns={
        <>
          {props.edit ? (
            <Button>Update</Button>
          ) : (
            <>
              <Button type="submit" onClick={handleFormSubmit}>
                Submit
              </Button>
              <Button onClick={handleReset} type="button" color="warning">
                Reset
              </Button>
            </>
          )}
        </>
      }
      handleCloseModal={props.handleCloseModal}
    >
      <form ref={newUserRef} onSubmit={handleSubmit}>
        <div className={styles.inputFields}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4} lg={4} xl={3}>
              <StyledMUITextField
                id="name"
                required
                label="Name"
                value={values.name}
                onChange={handleChangeValues}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} md={4} lg={4} xl={3}>
              <StyledMUITextField
                required
                id="email"
                type="email"
                error={helperTextObj?.email?.error}
                value={values.email}
                onChange={handleChangeValues}
                label="Email"
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} md={4} lg={4} xl={3}>
              <StyledMUITextField
                required
                id="password"
                value={values.password}
                type="password"
                onChange={handleChangeValues}
                label="Password"
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} md={4} lg={4} xl={3}>
              <MUICreatableSelect
                id="stream"
                error={helperTextObj?.stream?.error}
                helperText={helperTextObj?.stream?.helperText}
                value={values.stream}
                onChange={handleChangeValuesForCreatableSelect}
                options={optionsForStream}
                label="Stream"
              />
            </Grid>
            <Grid item xs={12} md={4} lg={4} xl={3}>
              <MUICreatableSelect
                id="standard"
                value={values.standard}
                error={helperTextObj?.standard?.error}
                helperText={helperTextObj?.standard?.helperText}
                onChange={handleChangeValuesForCreatableSelect}
                options={optionsForStandard}
                label="Standard"
              />
            </Grid>
            <Grid item xs={12} md={4} lg={4} xl={3}>
              <MUISimpleAutocomplete
                label="Gender"
                error={helperTextObj?.gender.error}
                helperText={helperTextObj?.gender?.helperText}
                onChange={(val: any) => {
                  handleChangeValues({
                    target: { id: "gender", value: val },
                  } as any);
                }}
                options={[
                  { name: "Male", value: "male" },
                  { name: "Female", value: "female" },
                  { name: "Other", value: "other" },
                ]}
                value={values.gender}
              />
            </Grid>
            <Grid item xs={12} md={4} lg={4} xl={3}>
              <StyledMUITextField
                required
                id="dob"
                type="date"
                value={values.dob}
                onChange={handleChangeValues}
                label="DOB"
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} md={4} lg={4} xl={3}>
              <StyledMUITextField
                id="school"
                required
                value={values.school}
                onChange={handleChangeValues}
                label="School"
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} md={4} lg={4} xl={3}>
              <StyledMUITextField
                required
                id="aadhaar"
                type="text"
                value={values.aadhaar}
                onChange={handleChangeValues}
                error={helperTextObj?.aadhaar?.error}
                helperText={helperTextObj?.aadhaar?.helperText}
                label="Aadhaar Number"
                placeholder="Enter Aadhaar Number"
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} md={4} lg={4} xl={3}>
              <MUICreatableSelect
                id="batch"
                error={helperTextObj?.batch?.error}
                helperText={helperTextObj?.batch?.helperText}
                value={values.batch}
                onChange={handleChangeValuesForCreatableSelect}
                options={optionsForBatch}
                label="Batch"
              />
            </Grid>

            <Grid item xs={12} md={4} lg={4} xl={3}>
              <StyledMUITextField
                required
                id="city"
                type="text"
                value={values.city}
                onChange={handleChangeValues}
                label="City"
                placeholder="Enter a City"
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} md={4} lg={4} xl={3}>
              <StyledMUITextField
                required
                id="state"
                type="text"
                value={values.state}
                onChange={handleChangeValues}
                label="State"
                placeholder="Enter a State"
                variant="outlined"
              />
            </Grid>

            <Grid item xs={12} md={4} lg={4} xl={3}>
              <StyledMUITextField
                id="parentName"
                required
                value={values.parentName}
                onChange={handleChangeValues}
                label="Parent Name"
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} md={4} lg={4} xl={3}>
              <StyledMUITextField
                id="parentContact"
                required
                type="number"
                error={helperTextObj?.contact?.parent?.error}
                helperText={helperTextObj?.contact?.parent?.helperText}
                value={values.parentContact}
                onChange={handleChangeValues}
                label="Parent Contact"
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} md={4} lg={4} xl={3}>
              <StyledMUITextField
                required
                id="contact"
                type="number"
                error={helperTextObj?.contact?.personal?.error}
                helperText={helperTextObj?.contact?.personal?.helperText}
                value={values.contact}
                onChange={handleChangeValues}
                label="Contact"
                variant="outlined"
              />
            </Grid>
          </Grid>
          <Grid container spacing={2}>
            <Grid item xs={12} md={12} lg={12} xl={8}>
              <MUIChipsAutocomplete
                label="Role(s)"
                value={roles}
                options={rolesInfo?.options}
                onChange={setRoles}
                error={helperTextObj?.roles?.error}
                helperText={helperTextObj?.roles?.helperText}
              />
            </Grid>
            <Grid item xs={12} md={12} lg={12} xl={8}>
              <StyledMUITextField
                required
                className="largeWidthInput"
                id="currentAddress"
                value={values.currentAddress}
                onChange={handleChangeValues}
                label="Current Address"
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} md={12} lg={12} xl={8}>
              <StyledMUITextField
                required
                className="largeWidthInput"
                id="permanentAddress"
                value={values.permanentAddress}
                onChange={handleChangeValues}
                label="Permanent Address"
                variant="outlined"
              />
            </Grid>
          </Grid>

          {/* <StyledMUITextField
            id="uploadedBy"
            className="uploadedBy"
            value={uploadedBy}
            label="Uploaded By"
            disabled
            variant="outlined"
          /> */}
        </div>
      </form>
      {openDropzne && (
        <div className={styles.dropzoneContainer}>
          <div className={styles.close}>
            <IconButton
              edge="start"
              color="inherit"
              onClick={() => setOpenDropzone(false)}
              aria-label="close"
            >
              <CloseIcon />
            </IconButton>
          </div>
          <Dropzone onDrop={(acceptedFiles: any) => setFile(acceptedFiles[0])}>
            {({ getRootProps, getInputProps }) => (
              <section className={styles.dropzone}>
                <div {...getRootProps()}>
                  <input {...getInputProps()} accept=".xlsx," title="upload" />
                  <p>
                    {file?.name ||
                      "Click or drag n drop to upload an excel file"}
                  </p>
                  {loading && (
                    <div className={styles.progress}>
                      <LinearProgress />
                    </div>
                  )}
                </div>
              </section>
            )}
          </Dropzone>
          <Button
            type="button"
            onClick={handleUploadFile}
            classes={[styles.uploadBtn]}
            disabled={loading}
          >
            Upload
          </Button>
        </div>
      )}
    </AddUserModal>
    // </div>
  );
};

//----------------------------------------------User Type: Student
