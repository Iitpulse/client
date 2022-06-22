import { StyledMUITextField, UserProps } from "../components";
import closeIcon from "../../../assets/icons/close-circle.svg";
import clsx from "clsx";
import styles from "./Teachers.module.scss";
import { Button, MUISimpleAutocomplete } from "../../../components";
import { useContext, useState } from "react";
import { AuthContext } from "../../../utils/auth/AuthContext";
import axios from "axios";
import { APIS } from "../../../utils/constants";
import { Table } from "antd";
import { rowSelection } from "../Users";
import { UsersContext } from "../../../utils/contexts/UsersContext";
import AddUserModal from "../components/AddUserModal";

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
  },
  {
    title: "Name",
    dataIndex: "name",
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
    title: "Contact",
    dataIndex: "contact",
    // width: 100,
  },
];

const Teachers: React.FC<{
  activeTab: number;
  teacher: UserProps;
  openModal: boolean;
  handleCloseModal: () => void;
  loading: boolean;
}> = ({ activeTab, teacher, openModal, handleCloseModal, loading }) => {
  const [data, setData] = useState([]);

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
