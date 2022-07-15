import { StyledMUITextField, UserProps } from "../components";
import closeIcon from "../../../assets/icons/close-circle.svg";
import clsx from "clsx";
import styles from "./Teachers.module.scss";
import { Button, MUISimpleAutocomplete } from "../../../components";
import { useContext, useRef, useState } from "react";
import { AuthContext } from "../../../utils/auth/AuthContext";
import axios from "axios";
import { APIS } from "../../../utils/constants";
import { Input, Space, Table, Button as AntButton } from "antd";
import { DataType, rowSelection } from "../Users";
import { UsersContext } from "../../../utils/contexts/UsersContext";
import AddUserModal from "../components/AddUserModal";

import Highlighter from "react-highlight-words";
// import type { InputRef } from 'antd';
import type { ColumnsType, ColumnType } from "antd/lib/table";
import type { FilterConfirmProps } from "antd/lib/table/interface";
import { SearchOutlined } from "@ant-design/icons";

const Teachers: React.FC<{
  activeTab: number;
  teacher: UserProps;
  openModal: boolean;
  handleCloseModal: () => void;
  loading: boolean;
}> = ({ activeTab, teacher, openModal, handleCloseModal, loading }) => {
  const [searchText, setSearchText] = useState("");
  const [searchedColumn, setSearchedColumn] = useState("");
  const searchInput = useRef<any>(null);

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
      width: 200,
      render: (text: string) => (
        <span style={{ overflow: "ellipsis", minWidth: "300px" }}>{text}</span>
      ),
      ...getColumnSearchProps("name"),
    },
    {
      title: "Email",
      dataIndex: "email",
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
    },
    {
      title: "Institute",
      dataIndex: "institute",
      ...getColumnSearchProps("institute"),

      // width: 200,
    },
    {
      title: "Subject",
      dataIndex: "subject",
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

  const { teachers } = useContext(UsersContext);

  return (
    <div className={styles.container}>
      <Table
        rowSelection={{
          type: "checkbox",
          ...rowSelection,
        }}
        columns={columns}
        dataSource={teachers as any}
        loading={loading}
        scroll={{ x: 100 }}
      />
      {openModal && activeTab === 1 && (
        <Teacher teacher={teacher} handleCloseModal={handleCloseModal} />
      )}
    </div>
  );
};

export default Teachers;

const Teacher: React.FC<{
  teacher: UserProps;
  handleCloseModal: () => void;
}> = (props) => {
  const { uploadedBy, handleReset } = props.teacher;

  const [values, setValues] = useState({} as any);

  const { currentUser } = useContext(AuthContext);

  function handleChangeValues(e: React.ChangeEvent<HTMLInputElement>) {
    const { id, value } = e.target;
    console.log({ id, value });
    setValues({ ...values, [id]: value });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    let newValues = { ...values };

    newValues.userType = "teacher";
    newValues.createdBy = {
      id: currentUser?.id,
      userType: currentUser?.userType,
    };
    newValues.institute = currentUser?.instituteId;
    newValues.roles = [
      {
        id: "ROLE_TEACHER",
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

    const res = await axios.post(
      `${process.env.REACT_APP_USERS_API}/teacher/create`,
      newValues
    );
    console.log({ res });

    if (res.status === 200) {
      return alert("Succesfully created user");
    } else {
      return alert("Some error occured");
    }

    // handleReset();
  }

  return (
    <div className={clsx(styles.studentContainer, styles.modal)}>
      <AddUserModal
        title="Add a Teacher"
        actionBtns={
          <>
            <Button onClick={handleReset} type="button" color="warning">
              Reset
            </Button>
            <Button>Submit</Button>
          </>
        }
        classes={[styles.studentContainer]}
        // loading={loading}
        // success={succ}
        // error={error}
        handleCloseModal={props.handleCloseModal}
      >
        <form onSubmit={handleSubmit}>
          {/* <div className={styles.header}>
          <h2>Add a Teacher</h2>
          <img onClick={props.handleCloseModal} src={closeIcon} alt="Close" />
        </div> */}
          <div className={styles.inputFields}>
            {/* <StyledMUITextField
            id="id"
            disabled
            label="Id"
            value={id}
            variant="outlined"
          /> */}
            <StyledMUITextField
              id="name"
              required
              label="Name"
              value={values.name}
              onChange={handleChangeValues}
              variant="outlined"
            />

            <StyledMUITextField
              required
              id="email"
              value={values.email}
              onChange={handleChangeValues}
              label="Email"
              variant="outlined"
            />
            <StyledMUITextField
              required
              id="password"
              value={values.password}
              type="password"
              onChange={handleChangeValues}
              label="Password"
              variant="outlined"
            />
            {/* <StyledMUITextField
            required
            id="adhaarNumber"
            value={adhaarNumber}
            onChange={handleChangeValues}
            label="Adhaar Number"
            variant="outlined"
          /> */}
            <StyledMUITextField
              required
              id="contact"
              value={values.contact}
              onChange={handleChangeValues}
              label="Contact"
              variant="outlined"
            />
            {/* <StyledMUITextField
            required
            id="emergencyContact"
            value={emergencyContact}
            onChange={(e: any) => setEmergencyContact(e.target.value)}
            label="Emergency Contact"
            variant="outlined"
          /> */}
            <div className={styles.singlSelect}>
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
                ]}
                value={values.gender}
              />
            </div>

            <StyledMUITextField
              id="uploadedBy"
              className="uploadedBy"
              value={uploadedBy}
              label="Uploaded By"
              disabled
              variant="outlined"
            />
          </div>
          {/* <div className={styles.buttons}>
          <Button onClick={handleReset} type="button" color="warning">
            Reset
          </Button>
          <Button>Submit</Button>
        </div> */}
        </form>
      </AddUserModal>
    </div>
  );
};
