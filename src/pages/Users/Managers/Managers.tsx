import { StyledMUITextField, UserProps } from "../components";
import closeIcon from "../../../assets/icons/close-circle.svg";
import clsx from "clsx";
import styles from "./Managers.module.scss";
import { Button } from "../../../components";

const Managers: React.FC<{
  activeTab: number;
  manager: UserProps;
  openModal: boolean;
  handleCloseModal: () => void;
}> = ({ activeTab, manager, openModal, handleCloseModal }) => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Managers</h1>
        <Button>Add manager</Button>
      </div>
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
