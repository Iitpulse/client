import { StyledMUITextField, UserProps } from "../components";
import closeIcon from "../../../assets/icons/close-circle.svg";
import clsx from "clsx";
import styles from "./Operators.module.scss";
import { Button } from "../../../components";
import { Table } from "antd";
import { rowSelection } from "../Users";
import { useState, useContext } from "react";
import axios from "axios";
import { Grid } from "@mui/material";
import {
  MUIChipsAutocomplete,
  MUISimpleAutocomplete,
} from "../../../components";
import AddUserModal from "../components/AddUserModal";
import { AuthContext } from "../../../utils/auth/AuthContext";

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

const Operators: React.FC<{
  activeTab: number;
  operator: UserProps;
  openModal: boolean;
  handleCloseModal: () => void;
  loading: boolean;
}> = ({ activeTab, operator, openModal, handleCloseModal, loading }) => {
  const data: any = [];

  return (
    <div className={styles.container}>
      <Table
        rowSelection={{
          type: "checkbox",
          ...rowSelection,
        }}
        columns={columns}
        dataSource={data as any}
        loading={loading}
      />
      {openModal && activeTab === 3 && (
        <Operator operator={operator} handleCloseModal={handleCloseModal} />
      )}
    </div>
  );
};

export default Operators;

const Operator: React.FC<{
  operator: UserProps;
  handleCloseModal: () => void;
}> = (props) => {
  const { uploadedBy, handleReset } = props.operator;
  const [values, setValues] = useState({} as any);
  const [roles, setRoles] = useState("");
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
        title="Add an Operator"
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
          </div>
        </form>
      </AddUserModal>
    </div>
  );
};
