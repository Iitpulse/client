import { StyledMUITextField, UserProps } from "../components";
import closeIcon from "../../../assets/icons/close-circle.svg";
import clsx from "clsx";
import styles from "./Managers.module.scss";
import { Button } from "../../../components";
import { Table } from "antd";
import { rowSelection } from "../Users";
import { useContext } from "react";
import { UsersContext } from "../../../utils/contexts/UsersContext";

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

const Managers: React.FC<{
  activeTab: number;
  manager: UserProps;
  openModal: boolean;
  handleCloseModal: () => void;
  loading: boolean;
}> = ({ activeTab, manager, openModal, handleCloseModal, loading }) => {
  const { managers } = useContext(UsersContext);

  return (
    <div className={styles.container}>
      <Table
        rowSelection={{
          type: "checkbox",
          ...rowSelection,
        }}
        columns={columns}
        dataSource={managers as any}
        loading={loading}
      />
      {openModal && activeTab === 4 && (
        <Manager manager={manager} handleCloseModal={handleCloseModal} />
      )}
    </div>
  );
};

export default Managers;

const Manager: React.FC<{
  manager: UserProps;
  handleCloseModal: () => void;
}> = (props) => {
  const {
    onSubmit,
    name,
    setName,
    email,
    setEmail,
    adhaarNumber,
    setAdhaarNumber,
    permanentAddress,
    setPermanentAddress,
    currentAddress,
    setCurrentAddress,
    personalContact,
    setPersonalContact,
    emergencyContact,
    setEmergencyContact,
    uploadedBy,
    id,
    handleReset,
  } = props.manager;
  return (
    <div className={clsx(styles.studentContainer, styles.modal)}>
      <form onSubmit={onSubmit}>
        <div className={styles.header}>
          <h2>Add a Manager</h2>
          <img onClick={props.handleCloseModal} src={closeIcon} alt="Close" />
        </div>
        <div className={styles.inputFields}>
          <StyledMUITextField
            id="id"
            disabled
            label="Id"
            value={id}
            variant="outlined"
          />
          <StyledMUITextField
            id="name"
            required
            label="Name"
            value={name}
            onChange={(e: any) => setName(e.target.value)}
            variant="outlined"
          />
          <StyledMUITextField
            required
            className="largeWidthInput"
            id="currentAddress"
            value={currentAddress}
            onChange={(e: any) => setCurrentAddress(e.target.value)}
            label="Current Address"
            variant="outlined"
          />
          <StyledMUITextField
            required
            className="largeWidthInput"
            id="permanentAddress"
            value={permanentAddress}
            onChange={(e: any) => setPermanentAddress(e.target.value)}
            label="Permanent Address"
            variant="outlined"
          />
          <StyledMUITextField
            required
            id="email"
            value={email}
            onChange={(e: any) => setEmail(e.target.value)}
            label="Email"
            variant="outlined"
          />
          <StyledMUITextField
            required
            id="adhaarNumber"
            value={adhaarNumber}
            onChange={(e: any) => setAdhaarNumber(e.target.value)}
            label="Adhaar Number"
            variant="outlined"
          />
          <StyledMUITextField
            required
            id="personalContact"
            value={personalContact}
            onChange={(e: any) => setPersonalContact(e.target.value)}
            label="Personal Contact"
            variant="outlined"
          />
          <StyledMUITextField
            required
            id="emergencyContact"
            value={emergencyContact}
            onChange={(e: any) => setEmergencyContact(e.target.value)}
            label="Emergency Contact"
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
