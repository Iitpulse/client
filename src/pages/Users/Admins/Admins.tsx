import { StyledMUITextField, UserProps } from "../components";
import closeIcon from "../../../assets/icons/close-circle.svg";
import clsx from "clsx";
import styles from "./Admins.module.scss";
import { Button, CustomTable, Sidebar, UserProfile } from "../../../components";
import { Grid, IconButton } from "@mui/material";
import axios from "axios";
import {
  Input,
  Space,
  Table,
  Button as AntButton,
  Popconfirm,
  message,
} from "antd";
import { DataType, rowSelection } from "../Users";
import { useContext, useEffect, useRef, useState } from "react";
import { UsersContext } from "../../../utils/contexts/UsersContext";
import { EyeFilled, SearchOutlined } from "@ant-design/icons";
import Highlighter from "react-highlight-words";
import { ColumnType } from "antd/lib/table";
import { AuthContext } from "../../../utils/auth/AuthContext";
import AddUserModal from "../components/AddUserModal";
import deleteIcon from "../../../assets/icons/delete.svg";

import {
  MUIChipsAutocomplete,
  MUISimpleAutocomplete,
} from "../../../components";
import { FilterConfirmProps } from "antd/lib/table/interface";
import { API_USERS } from "../../../utils/api/config";
import { Edit } from "@mui/icons-material";
import AddNewAdmin from "./AddNewAdmin";
import { CurrentContext } from "../../../utils/contexts/CurrentContext";
// import { record } from "zod";

const Admins: React.FC<{
  activeTab: number;
  admin: UserProps;
  openModal: boolean;
  handleCloseModal: () => void;
  loading: boolean;
}> = ({ activeTab, admin, openModal, handleCloseModal, loading }) => {
  const [searchText, setSearchText] = useState("");
  const [searchedColumn, setSearchedColumn] = useState("");
  const [current, setCurrent] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const searchInput = useRef<any>(null);
  const [edit, setEdit] = useState<any>(false);

  const [isDrawerOpen, setIsDrawerOpen] = useState(openModal);
  const { selectedUsers, setSelectedUsers } = useContext(CurrentContext);

  useEffect(() => {
    setIsDrawerOpen(openModal);
  }, [openModal]);
  // const [isDrawerOpen, setIsDrawerOpen] = useState(false);
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
      render: (text: string) => (
        <span style={{ textTransform: "capitalize" }}>{text}</span>
      ),
    },
    {
      title: "Contact",
      dataIndex: "contact",
      // width: 100,
      ...getColumnSearchProps("contact"),
    },
  ];

  const { admins, fetchAdmins } = useContext(UsersContext);
  const deleteUser = async () => {
    try {
      const res = await API_USERS().delete(`/admin/${current?._id}`);
      console.log({ res });
      if (res.status === 200) {
        setIsSidebarOpen(false);
        fetchAdmins();
        message.success("User deleted successfully");
      }
    } catch (error) {
      console.log({ error });
      message.error("Error deleting User");
    }
  };
  return (
    <div className={styles.container}>
      <CustomTable
        selectedRows={selectedUsers}
        setSelectedRows={setSelectedUsers}
        selectable={true}
        columns={columns}
        dataSource={admins as any}
        loading={loading}
      />
      {!edit && (
        <AddNewAdmin
          open={isDrawerOpen}
          setOpen={handleCloseModal}
          admin={admin}
          title="Add an Admin"
          handleCloseModal={handleCloseModal}
        />
      )}
      {edit && (
        <AddNewAdmin
          edit={true}
          current={current}
          open={isDrawerOpen}
          setOpen={() => {
            setEdit(false);
            handleCloseModal();
            setIsDrawerOpen(false);
          }}
          admin={admin}
          title="Edit an Admin"
          handleCloseModal={handleCloseModal}
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
      {/* {openModal && activeTab === 2 && (
        <Admin admin={admin} handleCloseModal={handleCloseModal} />
      )} */}
    </div>
  );
};

export default Admins;

const Admin: React.FC<{ admin: UserProps; handleCloseModal: () => void }> = (
  props
) => {
  const { uploadedBy, handleReset } = props.admin;
  const [values, setValues] = useState({} as any);
  const [roles, setRoles] = useState([]);
  const [rolesInfo, setRolesInfo] = useState({
    options: [],
    actual: [],
  });
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
  const { currentUser } = useContext(AuthContext);

  function handleChangeValues(e: React.ChangeEvent<HTMLInputElement>) {
    const { id, value } = e.target;
    console.log({ id, value });
    setValues({ ...values, [id]: value });
  }

  async function handleSubmit(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    let newValues = { ...values };

    newValues.userType = "admin";
    newValues.createdBy = {
      id: currentUser?.id,
      userType: currentUser?.userType,
    };
    newValues.institute = currentUser?.instituteId;
    newValues.roles = [
      {
        id: "ROLE_ADMIN",
        from: new Date().toISOString(),
        to: new Date().toISOString(),
      },
    ];
    newValues.createdAt = new Date().toISOString();
    newValues.modifiedAt = new Date().toISOString();
    newValues.previousTests = [];
    newValues.validity = {
      from: new Date().toISOString(),
      to: new Date().toISOString(),
    };
    console.log({ newValues });

    const res = await API_USERS().post(`/admin/create`, newValues);
    // console.log({ res });

    if (res.status === 200) {
      return alert("Succesfully created user");
    } else {
      return alert("Some error occured");
    }

    // handleReset();
  }
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
      const roleMap: any = {
        ROLE_STUDENT: "CREATE_STUDENT",
        ROLE_TEACHER: "CREATE_TEACHER",
        ROLE_ADMIN: "CREATE_ADMIN",
        ROLE_OPERATOR: "CREATE_OPERATOR",
        ROLE_MANAGER: "CREATE_MANAGER",
      };
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
    <div className={clsx(styles.studentContainer, styles.modal)}>
      <AddUserModal
        title="Add an Admin"
        actionBtns={
          <>
            <Button onClick={handleReset} type="button" color="warning">
              Reset
            </Button>
            <Button onClick={handleSubmit}>Submit</Button>
          </>
        }
        classes={[styles.studentContainer]}
        // loading={loading}
        // success={succ}
        // error={error}
        handleCloseModal={props.handleCloseModal}
      >
        <form>
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

              <Grid item xs={12} md={4} lg={4} xl={3}>
                <MUISimpleAutocomplete
                  label="Gender"
                  onChange={(val: any) => {
                    console.log({ val });
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
                  required
                  id="emergencyContact"
                  type="number"
                  value={values.emergencyContact}
                  onChange={handleChangeValues}
                  label="Emergency Contact"
                  variant="outlined"
                />
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid item xs={12} md={12} lg={12} xl={8}>
                <MUIChipsAutocomplete
                  label="Role(s)"
                  options={rolesInfo?.options}
                  onChange={setRoles}
                  value={roles}
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
          </div>
        </form>
      </AddUserModal>
    </div>
  );
};
