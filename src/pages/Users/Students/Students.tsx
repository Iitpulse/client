import { useContext, useState } from "react";
import clsx from "clsx";
import { Button } from "../../../components";
import { StyledMUITextField, UserProps } from "../components";
import closeIcon from "../../../assets/icons/close-circle.svg";
import styles from "./Students.module.scss";
import { Table } from "antd";
import "antd/dist/antd.css";
import { AuthContext } from "../../../utils/auth/AuthContext";
import axios from "axios";

const columns = [
  {
    title: "ID",
    dataIndex: "id",
    // render: (text: string) => <a>{text}</a>,
  },
  {
    title: "Name",
    dataIndex: "name",
  },
  {
    title: "Branch",
    dataIndex: "branch",
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

const Students: React.FC<{
  activeTab: number;
  student: UserProps;
  openModal: boolean;
  handleCloseModal: () => void;
}> = ({ activeTab, student, openModal, handleCloseModal }) => {
  const data: DataType[] = Array(100)
    .fill({
      key: "IITP_ST_ABC123",
      id: "IITP_ST_ABC123",
      name: "Student",
      branch: "CSE",
    })
    .map((item, i) => ({ ...item, id: item.id + i, key: item.id + i }));

  return (
    <div className={styles.container}>
      <Table
        rowSelection={{
          type: "checkbox",
          ...rowSelection,
        }}
        columns={columns}
        dataSource={data}
      />
      {openModal && activeTab === 0 && (
        <Student student={student} handleCloseModal={handleCloseModal} />
      )}
    </div>
  );
};

export default Students;

const Student: React.FC<{
  student: UserProps;
  handleCloseModal: () => void;
}> = (props) => {
  const { onSubmit, uploadedBy, handleReset } = props.student;
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
    newValues.roles = ["ROLE_STUDENT"];
    newValues.createdAt = new Date().toISOString();
    newValues.modifiedAt = new Date().toISOString();
    console.log({ newValues });

    const res = await axios.post(
      "http://localhost:5000/student/create",
      newValues
    );
    console.log({ res });

    // handleReset();
  }

  return (
    <div className={clsx(styles.studentContainer, styles.modal)}>
      <form onSubmit={handleSubmit}>
        <div className={styles.header}>
          <h2>Add a Student</h2>
          <img onClick={props.handleCloseModal} src={closeIcon} alt="Close" />
        </div>
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
            type="email"
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
            label="password"
            variant="outlined"
          />
          <StyledMUITextField
            id="stream"
            required
            value={values.stream}
            onChange={handleChangeValues}
            label="Stream"
            variant="outlined"
          />
          <StyledMUITextField
            id="parentName"
            required
            value={values.parentName}
            onChange={handleChangeValues}
            label="Parent Name"
            variant="outlined"
          />
          <StyledMUITextField
            id="parentContact"
            required
            value={values.parentContact}
            onChange={handleChangeValues}
            label="Parent Contact"
            variant="outlined"
          />
          <StyledMUITextField
            id="school"
            required
            value={values.school}
            onChange={handleChangeValues}
            label="School"
            variant="outlined"
          />
          <StyledMUITextField
            id="batch"
            required
            value={values.batch}
            onChange={handleChangeValues}
            label="Batch"
            variant="outlined"
          />
          <StyledMUITextField
            required
            className="largeWidthInput"
            id="address"
            value={values.address}
            onChange={handleChangeValues}
            label="Address"
            variant="outlined"
          />
          <StyledMUITextField
            required
            id="contact"
            type="number"
            value={values.contact}
            onChange={handleChangeValues}
            label="Contact"
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
