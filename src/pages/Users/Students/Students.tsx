import { useContext, useEffect, useState } from "react";
import clsx from "clsx";
import { Button, MUISimpleAutocomplete } from "../../../components";
import { StyledMUITextField, UserProps } from "../components";
import closeIcon from "../../../assets/icons/close-circle.svg";
import styles from "./Students.module.scss";
import { Table } from "antd";
import "antd/dist/antd.css";
import { AuthContext } from "../../../utils/auth/AuthContext";
import axios from "axios";
import Dropzone from "react-dropzone";
import { IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

const columns = [
  {
    title: "ID",
    dataIndex: "id",
    width: 50,
    // render: (text: string) => <a>{text}</a>,
  },
  {
    title: "Name",
    dataIndex: "name",
    width: 200,
  },
  {
    title: "Branch",
    dataIndex: "branch",
    width: 100,
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
  // const data: DataType[] = Array(100)
  //   .fill({
  //     key: "IITP_ST_ABC123",
  //     id: "IITP_ST_ABC123",
  //     name: "Student",
  //     branch: "CSE",
  //   })
  //   .map((item, i) => ({ ...item, id: item.id + i, key: item.id + i }));

  const [data, setData] = useState([]);

  useEffect(() => {
    async function fetchStudents() {
      const res = await axios.get("http://localhost:5000/student/");
      console.log({ res });
      setData(res.data?.map((item: any) => ({ ...item, key: item.id })));
    }
    fetchStudents();
  }, []);

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
  const [openDropzne, setOpenDropzone] = useState(false);
  const [file, setFile] = useState(null as any);

  const { currentUser } = useContext(AuthContext);

  function handleChangeValues(e: React.ChangeEvent<HTMLInputElement>) {
    const { id, value } = e.target;
    console.log({ id, value });
    setValues({ ...values, [id]: value });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (values.contact?.length !== 10) {
      return alert("Contact must be 10 digits long");
    }
    if (values.parentContact?.length !== 10) {
      return alert("Parent Contact must be 10 digits long");
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

  async function handleUploadFile() {
    if (currentUser) {
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
      console.log({ formData: formData.get("file") });

      const bulkRes = await axios.post(
        "http://localhost:5000/student/bulk",
        formData
      );
      console.log({ bulkRes });
    }
  }

  return (
    <div className={clsx(styles.studentContainer, styles.modal)}>
      <form onSubmit={handleSubmit}>
        <div className={styles.header}>
          <div className={styles.flexRow}>
            <h2>Add a Student</h2>
            <Button type="button" onClick={() => setOpenDropzone(true)}>
              Bulk Upload
            </Button>
          </div>
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
            type="number"
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
            id="contact"
            type="number"
            value={values.contact}
            onChange={handleChangeValues}
            label="Contact"
            variant="outlined"
          />
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
            required
            className="largeWidthInput"
            id="address"
            value={values.address}
            onChange={handleChangeValues}
            label="Address"
            variant="outlined"
          />
          {/* <StyledMUITextField
            id="uploadedBy"
            className="uploadedBy"
            value={uploadedBy}
            label="Uploaded By"
            disabled
            variant="outlined"
          /> */}
        </div>
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
            <Dropzone
              onDrop={(acceptedFiles: any) => setFile(acceptedFiles[0])}
            >
              {({ getRootProps, getInputProps }) => (
                <section className={styles.dropzone}>
                  <div {...getRootProps()}>
                    <input
                      {...getInputProps()}
                      accept=".xlsx,"
                      title="upload"
                    />
                    <p>
                      {file?.name ||
                        "Click or drag n drop to upload an excel file"}
                    </p>
                  </div>
                </section>
              )}
            </Dropzone>
            <Button
              type="button"
              onClick={handleUploadFile}
              classes={[styles.uploadBtn]}
            >
              Upload
            </Button>
          </div>
        )}
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
