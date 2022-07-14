import { useContext, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import {
  Button,
  MUIChipsAutocomplete,
  MUISimpleAutocomplete,
  Sidebar,
  UserProfile,
  Modal,
} from "../../../components";
import {
  StyledMUITextField,
  UserProps,
  MUICreatableSelect,
} from "../components";
import closeIcon from "../../../assets/icons/close-circle.svg";
import styles from "./Students.module.scss";
import { Input, Space, Table, Button as AntButton } from "antd";
import "antd/dist/antd.css";
import { AuthContext } from "../../../utils/auth/AuthContext";
import axios from "axios";
import Dropzone from "react-dropzone";
import { IconButton, LinearProgress, Grid } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { createFilterOptions } from "@mui/material/Autocomplete";
import { APIS } from "../../../utils/constants";
import { UsersContext } from "../../../utils/contexts/UsersContext";
import { CurrentContext } from "../../../utils/contexts/CurrentContext";
import AddUserModal from "../components/AddUserModal";
import { ColumnType } from "antd/lib/table";
import { FilterConfirmProps } from "antd/lib/table/interface";
import { SearchOutlined } from "@ant-design/icons";
import Highlighter from "react-highlight-words";

const Students: React.FC<{
  activeTab: number;
  student: UserProps;
  openModal: boolean;
  handleCloseModal: () => void;
  loading: boolean;
}> = ({ activeTab, student, openModal, handleCloseModal, loading }) => {
  const { students } = useContext(UsersContext);
  const { setSelectedUsers, selectedUsers } = useContext(CurrentContext);

  const [searchText, setSearchText] = useState("");
  const [searchedColumn, setSearchedColumn] = useState("");
  const searchInput = useRef<any>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      // width: 50,
      render: (text: string) => (
        <span style={{ overflow: "ellipsis" }}>{text}</span>
      ),
      ...getColumnSearchProps("name"),
    },
    // {
    //   title: "ID",
    //   dataIndex: "id",
    //   width: 50,
    //   // render: (text: string) => <a>{text}</a>,
    // },
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
      // width: 100,
      render: (text: string) => (
        <span style={{ textTransform: "capitalize" }}> {text}</span>
      ),
    },
    {
      title: "Contact",
      dataIndex: "contact",
      // width: 100,
    },
  ];

  interface DataType {
    key: React.Key;
    id: string;
    name: string;
    branch: string;
  }

  const rowSelection = {
    onChange: (selectedRowKeys: React.Key[], selectedRows: DataType[]) => {
      setSelectedUsers(selectedRows);
    },
    getCheckboxProps: (record: DataType) => ({
      disabled: record.name === "Disabled User", // Column configuration not to be checked
      name: record.name,
    }),
  };

  // const data: DataType[] = Array(100)
  //   .fill({
  //     key: "IITP_ST_ABC123",
  //     id: "IITP_ST_ABC123",
  //     name: "Student",
  //     branch: "CSE",
  //   })
  //   .map((item, i) => ({ ...item, id: item.id + i, key: item.id + i }));

  // const [data, setData] = useState([]);

  // useEffect(() => {
  //   async function fetchStudents() {
  //     const res = await axios.get(
  //       `${process.env.REACT_APP_USERS_API}/student/`
  //     );
  //     console.log({ res });
  //     setData(res.data?.map((item: any) => ({ ...item, key: item.id })));
  //   }
  //   fetchStudents();
  // }, []);

  return (
    <div className={styles.container}>
      <Table
        rowSelection={{
          type: "checkbox",
          ...rowSelection,
        }}
        columns={columns}
        dataSource={students as any}
        loading={loading}
      />
      {openModal && activeTab === 0 && (
        <Student
          title="Add a Student"
          student={student}
          handleCloseModal={handleCloseModal}
        />
      )}
      {isEditModalOpen && (
        <Student
          title="Edit a Student"
          edit={{ values: selectedUsers[0] }}
          handleCloseModal={() => setIsEditModalOpen(false)}
        />
      )}

      <Modal
        title="Are you sure you want to delete this user?"
        hideCloseIcon={true}
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
      >
        <div className={clsx(styles.modalButtons, styles.actionButtons)}>
          <Button color="error">Delete</Button>
          <Button onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
        </div>
      </Modal>

      <Sidebar title="Recent Activity">
        <UserProfile
          handleEditModal={() => setIsEditModalOpen(true)}
          handleDeleteModal={() => setIsDeleteModalOpen(true)}
        />
      </Sidebar>
    </div>
  );
};

export default Students;

export const Student: React.FC<{
  student?: UserProps;
  title?: string;
  handleCloseModal: () => void;
  edit?: {
    values: any;
  };
}> = (props) => {
  const { onSubmit, uploadedBy } = { ...props.student };
  const [values, setValues] = useState({} as any);
  const [openDropzne, setOpenDropzone] = useState(false);
  const [file, setFile] = useState(null as any);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [roles, setRoles] = useState("");

  const { currentUser } = useContext(AuthContext);

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
    setValues({});
  }
  function handleChangeValuesForCreatableSelect(
    e: React.ChangeEvent<HTMLInputElement>,
    value: any
  ) {
    const { id } = e.target;
    const newId = id.split("-option").shift();
    setValues({ ...values, [newId ? newId : id]: value });
  }
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      if (values.contact?.length !== 10) {
        return alert("Contact must be 10 digits long");
      }
      if (values.parentContact?.length !== 10) {
        return alert("Parent Contact must be 10 digits long");
      }
      if (!values.gender) {
        return alert("Select a gender");
      }
      let newValues = { ...values };
      newValues.parentDetails = {
        name: newValues.parentName,
        contact: newValues.parentContact,
      };
      delete newValues.parentName;
      delete newValues.parentContact;
      newValues.userType = "student";
      newValues.createdBy = {
        id: currentUser?.id,
        userType: currentUser?.userType,
      };
      newValues.confirmPassword = newValues.password;
      newValues.institute = currentUser?.instituteId;
      newValues.roles = [
        {
          id: "ROLE_STUDENT",
          from: new Date().toISOString(),
          to: new Date(
            new Date().setDate(new Date().getDate() + 400)
          ).toISOString(),
        },
      ];
      newValues.createdAt = new Date().toISOString();
      newValues.modifiedAt = new Date().toISOString();

      const res = await axios.post(
        `${process.env.REACT_APP_USERS_API}/student/create`,
        newValues
      );
      // console.log({ res });

      setSuccess("Student created successfully");
    } catch (error: any) {
      setError(error.response.data.message);
    }
    setLoading(false);
    // handleReset();
  }

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

      const bulkRes = await axios.post(
        `${process.env.REACT_APP_USERS_API}/student/bulk`,
        formData
      );

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
  let optionsForBatch = [
    { name: "TLP31", value: "TLP31" },
    { name: "IOY12", value: "IOY12" },
    { name: "SAB12", value: "SAB12" },
  ];
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
              <Button>Submit</Button>

              <Button onClick={handleReset} type="button" color="warning">
                Reset
              </Button>
            </>
          )}
        </>
      }
      handleCloseModal={props.handleCloseModal}
    >
      <form onSubmit={handleSubmit}>
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
                onChange={handleChangeValuesForCreatableSelect}
                options={optionsForStandard}
                label="Standard"
              />
            </Grid>
            <Grid item xs={12} md={4} lg={4} xl={3}>
              <MUISimpleAutocomplete
                label="Gender"
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
                type="text"
                value={values.dob}
                onChange={handleChangeValues}
                label="DOB"
                placeholder="DD/MM/YYYY"
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
                label="Aadhaar Number"
                placeholder="Enter Aadhaar Number"
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} md={4} lg={4} xl={3}>
              <MUICreatableSelect
                id="batch"
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
                options={[
                  { name: "Student", value: "student" },
                  { name: "Admin", value: "admin" },
                  { name: "Operator", value: "operator" },
                  { name: "Manager", value: "manager" },
                  { name: "Teacher", value: "teacher" },
                ]}
                onChange={setRoles}
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
