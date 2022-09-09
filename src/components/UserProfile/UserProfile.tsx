import { useContext, useEffect, useState } from "react";
import closeIcon from "../../assets/icons/close-circle.svg";
import avatar from "../../assets/images/profilePlaceholder.jpg";
import { IconButton } from "@mui/material";
import phone from "../../assets/icons/phone.svg";
import mail from "../../assets/icons/mail.svg";
import styles from "./UserProfile.module.scss";
import { CurrentContext } from "../../utils/contexts/CurrentContext";
import { Button } from "../";
import { Student } from "../../pages/Users/Students/Students";
import clsx from "clsx";

const UserProfile: React.FC<{
  handleEditModal: () => void;
  handleDeleteModal: () => void;
}> = ({ handleEditModal, handleDeleteModal }) => {
  const { selectedUsers } = useContext(CurrentContext);

  const [userType, setUserType] = useState<
    "student" | "teacher" | "admin" | "superadmin" | "manager" | "operator" | ""
  >("");
  useEffect(() => {
    if (selectedUsers.length > 0) setUserType(selectedUsers[0].userType);
    else setUserType("");
  }, [selectedUsers]);
  if (userType === "student" && selectedUsers.length > 0) {
    if (selectedUsers.length === 1) {
      return (
        <>
          <StudentSideMenu
            handleEditModal={handleEditModal}
            handleDeleteModal={handleDeleteModal}
            selectedUsers={selectedUsers}
          />
        </>
      );
    }
  }

  return <>{/* <StudentSideMenu student={props.user} /> */}</>;
};

interface StudentSideMenuProps {
  selectedUsers: Array<any>;
  handleEditModal: () => void;
  handleDeleteModal: () => void;
}

const StudentSideMenu = (props: StudentSideMenuProps) => {
  const {
    id,
    batch,
    email,
    name,
    standard,
    stream,
    age,
    gender,
    currentAddress,
    dob,
    contact,
    parentDetails,
  } = props.selectedUsers[0];

  return (
    <>
      <div className={styles.student}>
        {/* <span className={clsx(styles.value, styles.id)}>{id}</span> */}
        <img className={styles.avatar} src={avatar} alt={name} />
        <p className={styles.name}>{name}</p>
        <p className={styles.value}>{batch}</p>
        <div className={styles.icons}>
          <IconButton href={"tel:+91" + contact}>
            <img src={phone} alt="Phone" />
          </IconButton>
          <IconButton
            target="_blank"
            href={"https://mail.google.com/mail/?view=cm&fs=1&to=" + email}
          >
            <img src={mail} alt="Email" />
          </IconButton>
        </div>
        <div className={styles.class}>
          <p className={styles.property}>Class</p>
          <p className={styles.value}>{standard ? standard + "th" : "12th"}</p>
        </div>
        <div className={styles.course}>
          <p className={styles.property}>Stream</p>
          <p className={styles.value}>
            {stream ? stream : "NEET_BLOCKBUSTER21"}
          </p>
        </div>
        <div className={styles.ageGenderDOB}>
          <div className={styles.age}>
            <p className={styles.property}>Age</p>
            <p className={styles.value}>{age ? age : 21}</p>
          </div>
          <div className={styles.age}>
            <p className={styles.property}>Gender</p>
            <p className={styles.value}>{gender ? gender : "Male"}</p>
          </div>
          <div className={styles.DOB}>
            <p className={styles.property}>DOB</p>
            <p className={styles.value}>{dob ? dob : "02/06/2001"}</p>
          </div>
        </div>
        <div className={styles.address}>
          <p className={styles.property}>Address</p>
          <p className={styles.value}>
            {currentAddress
              ? currentAddress
              : "3, Lala Rajpat Rai Colony, Jawhar Chowk Road, Mumbai"}
          </p>
        </div>
        <div className={styles.contact}>
          <p className={styles.property}>Contact</p>
          <p className={styles.value}>{contact}</p>
        </div>
        <div className={styles.parentsContact}>
          <p className={styles.property}>Parent's Contact</p>
          <p className={styles.value}>{parentDetails.contact}</p>
        </div>
        <div className={styles.buttons}>
          <Button onClick={props.handleEditModal} color="primary">
            Edit
          </Button>
          <Button onClick={props.handleDeleteModal} color="error">
            Delete
          </Button>
        </div>
      </div>
    </>
  );
};

export default UserProfile;
