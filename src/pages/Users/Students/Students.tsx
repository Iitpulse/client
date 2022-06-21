import { useContext, useEffect, useState } from "react";
import clsx from "clsx";
import { Button, MUISimpleAutocomplete } from "../../../components";
import {
  StyledMUITextField,
  UserProps,
  MUICreatableSelect,
} from "../components";
import closeIcon from "../../../assets/icons/close-circle.svg";
import styles from "./Students.module.scss";
import { Table } from "antd";
import "antd/dist/antd.css";
import { AuthContext } from "../../../utils/auth/AuthContext";
import axios from "axios";
import Dropzone from "react-dropzone";
import {
  IconButton,
  LinearProgress,
  Dialog,
  DialogActions,
  DialogTitle,
  DialogContent,
  DialogContentText,
  TextField,
  Autocomplete,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { createFilterOptions } from "@mui/material/Autocomplete";
import { APIS } from "../../../utils/constants";
import { UsersContext } from "../../../utils/contexts/UsersContext";
import { CurrentContext } from "../../../utils/contexts/CurrentContext";

const Students: React.FC<{
  activeTab: number;
  student: UserProps;
  openModal: boolean;
  handleCloseModal: () => void;
  loading: boolean;
}> = ({ activeTab, student, openModal, handleCloseModal, loading }) => {
  const { students } = useContext(UsersContext);
  const { setSelectedUsers, selectedUsers } = useContext(CurrentContext);
  useEffect(() => {
    console.log({ selectedUsers: selectedUsers });
  }, [selectedUsers]);
  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      // width: 50,
      render: (text: string) => (
        <span style={{ overflow: "ellipsis" }}>{text}</span>
      ),
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
      render: (text: string) => (
        <span style={{ textTransform: "capitalize" }}>{text}</span>
      ),
    },
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
      console.log(
        `selectedRowKeys: ${selectedRowKeys}`,
        "selectedRows: ",
        selectedRows
      );
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

  const [data, setData] = useState([]);

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { currentUser } = useContext(AuthContext);

  function handleChangeValues(e: React.ChangeEvent<HTMLInputElement>) {
    const { id, value } = e.target;
    console.log({ id, value });
    setValues({ ...values, [id]: value });
  }

  function handleChangeValuesForCreatableSelect(
    e: React.ChangeEvent<HTMLInputElement>,
    value: any
  ) {
    const { id } = e.target;
    const newId = id.split("-option").shift();
    setValues({ ...values, [newId ? newId : id]: value });
  }
  useEffect(() => {
    console.log({ values });
  });
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
      console.log({ newValues });

      const res = await axios.post(
        `${process.env.REACT_APP_USERS_API}/student/create`,
        newValues
      );
      console.log({ res });

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
            label="Password"
            variant="outlined"
          />
          <MUICreatableSelect
            id="stream"
            value={values.stream}
            onChange={handleChangeValuesForCreatableSelect}
            options={optionsForStream}
            label="Stream"
          />
          <MUICreatableSelect
            id="standard"
            value={values.standard}
            onChange={handleChangeValuesForCreatableSelect}
            options={optionsForStandard}
            label="Standard"
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
          <MUICreatableSelect
            id="batch"
            value={values.batch}
            onChange={handleChangeValuesForCreatableSelect}
            options={optionsForBatch}
            label="Batch"
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
                { name: "Other", value: "other" },
              ]}
              value={values.gender}
            />
          </div>

          <StyledMUITextField
            required
            className="largeWidthInput"
            id="currentAddress"
            value={values.currentAddress}
            onChange={handleChangeValues}
            label="Current Address"
            variant="outlined"
          />
          <StyledMUITextField
            required
            className="largeWidthInput"
            id="permanentAddress"
            value={values.permanentAddress}
            onChange={handleChangeValues}
            label="Permanent Address"
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
        <div className={styles.buttons}>
          <Button onClick={handleReset} type="button" color="warning">
            Reset
          </Button>
          <Button>Submit</Button>
        </div>
        <div className={styles.progressError}>
          {loading && <LinearProgress />}
          {error && <span className={styles.error}>{error}</span>}
          {success && <span className={styles.success}>{success}</span>}
        </div>
      </form>
    </div>
  );
};

//----------------------------------------------User Type: Student

interface FilmOptionType {
  inputValue?: string;
  title: string;
  year?: number;
}
const filter = createFilterOptions<FilmOptionType>();
const top100Films: readonly FilmOptionType[] = [
  { title: "The Shawshank Redemption", year: 1994 },
  { title: "The Godfather", year: 1972 },
  { title: "The Godfather: Part II", year: 1974 },
  { title: "The Dark Knight", year: 2008 },
  { title: "12 Angry Men", year: 1957 },
  { title: "Schindler's List", year: 1993 },
  { title: "Pulp Fiction", year: 1994 },
];

const MUICreatableSelect123 = () => {
  const [value, setValue] = useState<FilmOptionType | null>(null);
  const [open, toggleOpen] = useState(false);

  const handleClose = () => {
    setDialogValue({
      title: "",
      year: "",
    });
    toggleOpen(false);
  };

  const [dialogValue, setDialogValue] = useState({
    title: "",
    year: "",
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValue({
      title: dialogValue.title,
      year: parseInt(dialogValue.year, 10),
    });
    handleClose();
  };
  return (
    <div className={styles.creatableSelect}>
      <Autocomplete
        value={value}
        onChange={(event, newValue) => {
          console.log({ newValue });
          if (typeof newValue === "string") {
            // timeout to avoid instant validation of the dialog's form.
            setTimeout(() => {
              toggleOpen(true);
              setDialogValue({
                title: newValue,
                year: "",
              });
            });
          } else if (newValue && newValue.inputValue) {
            toggleOpen(true);
            setDialogValue({
              title: newValue.inputValue,
              year: "",
            });
          } else {
            setValue(newValue);
          }
        }}
        filterOptions={(options, params) => {
          const filtered = filter(options, params);
          // console.log({ params });
          if (params.inputValue !== "") {
            filtered.push({
              inputValue: params.inputValue,
              title: `Add "${params.inputValue}"`,
            });
          }

          return filtered;
        }}
        id="free-solo-dialog-demo"
        options={top100Films}
        getOptionLabel={(option) => {
          // e.g value selected with enter, right from the input
          if (typeof option === "string") {
            return option;
          }
          if (option.inputValue) {
            return option.inputValue;
          }
          return option.title;
        }}
        selectOnFocus
        clearOnBlur
        handleHomeEndKeys
        renderOption={(props, option) => <li {...props}>{option.title}</li>}
        sx={{ width: 300 }}
        freeSolo
        renderInput={(params) => (
          <TextField {...params} label="Free solo dialog" />
        )}
      />
      <Dialog open={open} onClose={handleClose}>
        <form onSubmit={handleSubmit}>
          <DialogTitle>Add a new film</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Did you miss any film in our list? Please, add it!
            </DialogContentText>
            <TextField
              autoFocus
              margin="dense"
              id="name"
              value={dialogValue.title}
              onChange={(event) =>
                setDialogValue({
                  ...dialogValue,
                  title: event.target.value,
                })
              }
              label="title"
              type="text"
              variant="standard"
            />
            <TextField
              margin="dense"
              id="name"
              value={dialogValue.year}
              onChange={(event) =>
                setDialogValue({
                  ...dialogValue,
                  year: event.target.value,
                })
              }
              label="year"
              type="number"
              variant="standard"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="submit">Add</Button>
          </DialogActions>
        </form>
      </Dialog>
    </div>
  );
};
