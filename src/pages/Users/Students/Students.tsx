import clsx from "clsx";
import { Button } from "../../../components";
import { StyledMUITextField, UserProps } from "../components";
import closeIcon from "../../../assets/icons/close-circle.svg";
import styles from "./Students.module.scss";
import {
  DataGrid,
  GridToolbarContainer,
  GridToolbarColumnsButton,
  GridToolbarFilterButton,
  GridToolbarExport,
  GridToolbarDensitySelector,
} from "@mui/x-data-grid";

function CustomToolbar() {
  return (
    <GridToolbarContainer>
      <GridToolbarColumnsButton touchRippleRef={null} />
      <GridToolbarFilterButton />
      <GridToolbarDensitySelector touchRippleRef={null} />
      <GridToolbarExport touchRippleRef={null} />
    </GridToolbarContainer>
  );
}

const Students: React.FC<{
  activeTab: number;
  student: UserProps;
  openModal: boolean;
  handleCloseModal: () => void;
}> = ({ activeTab, student, openModal, handleCloseModal }) => {
  const data = {
    columns: [
      {
        field: "id",
        headerName: "Id",
        hidden: false,
      },
      {
        field: "name",
        headerName: "Name",
        hidden: false,
      },
      {
        field: "branch",
        headerName: "Branch",
        hidden: false,
      },
    ],
    rows: [
      {
        id: "IITP_ST_ABC123",
        name: "Student",
        branch: "CSE",
      },
    ],
  };

  return (
    <div className={styles.container} style={{ height: 400, width: "100%" }}>
      <DataGrid
        {...data}
        components={{
          Toolbar: CustomToolbar,
        }}
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
    preparingFor,
    setPreparingFor,
    id,
    handleReset,
  } = props.student;

  return (
    <div className={clsx(styles.studentContainer, styles.modal)}>
      <form onSubmit={onSubmit}>
        <div className={styles.header}>
          <h2>Add a Student</h2>
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
            id="preparingFor"
            required
            value={preparingFor}
            onChange={(e: any) =>
              setPreparingFor ? setPreparingFor(e.target.value) : {}
            }
            label="Preparing For"
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

//----------------------------------------------User Type: Student
