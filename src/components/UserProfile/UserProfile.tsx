import { useContext, useEffect, useState } from "react";
import closeIcon from "../../assets/icons/close-circle.svg";
import avatar from "../../assets/images/profilePlaceholder.jpg";
import { IconButton } from "@mui/material";
import phone from "../../assets/icons/phone.svg";
import mail from "../../assets/icons/mail.svg";
import styles from "./UserProfile.module.scss";
import { CurrentContext } from "../../utils/contexts/CurrentContext";
import { Button } from "../";
import clsx from "clsx";

const UserProfile = () => {
  const { selectedUsers } = useContext(CurrentContext);
  const [userType, setUserType] = useState<
    "student" | "teacher" | "admin" | "superadmin" | "manager" | "operator" | ""
  >("");
  useEffect(() => {
    if (selectedUsers.length > 0) setUserType(selectedUsers[0].userType);
    else setUserType("");
  }, [selectedUsers]);
  useEffect(() => {
    // console.log(userType);
  });
  if (userType === "student" && selectedUsers.length > 0)
    return (
      <>
        <StudentSideMenu selectedUsers={selectedUsers} />
      </>
    );
  return <>{/* <StudentSideMenu student={props.user} /> */}</>;
};

interface StudentSideMenuProps {
  selectedUsers: Array<any>;
}

const StudentSideMenu = (props: StudentSideMenuProps) => {
  const {
    id,
    batch,
    name,
    standard,
    course,
    age,
    gender,
    address,
    DOB,
    contact,
    parentsContact,
  } = props.selectedUsers[0];
  useEffect(() => {
    console.log(
      id,
      batch,
      name,
      standard,
      course,
      age,
      gender,
      address,
      DOB,
      contact,
      parentsContact
    );
  });
  return (
    <div className={styles.student}>
      <span className={clsx(styles.value, styles.id)}>{id}</span>
      <img src={avatar} alt={name} />
      <span className={styles.name}>{name}</span>
      <span className={styles.value}>{batch}</span>
      <div className={styles.icons}>
        <IconButton>
          <img src={phone} alt="Phone" />
        </IconButton>
        <IconButton>
          <img src={mail} alt="Email" />
        </IconButton>
      </div>
      <div className={styles.class}>
        <span className={styles.property}>Class</span>
        <span className={styles.value}>{standard}</span>
      </div>
      <div className={styles.course}>
        <span className={styles.property}>Course</span>
        <span className={styles.value}>{course}</span>
      </div>
      <div className={styles.ageGenderDOB}>
        <div className={styles.age}>
          <span className={styles.property}>Age</span>
          <span className={styles.value}>{age}</span>
        </div>
        <div className={styles.age}>
          <span className={styles.property}>Gender</span>
          <span className={styles.value}>{gender}</span>
        </div>
        <div className={styles.DOB}>
          <span className={styles.property}>DOB</span>
          <span className={styles.value}>{DOB}</span>
        </div>
      </div>
      <div className={styles.address}>
        <span className={styles.property}>Address</span>
        <span className={styles.value}>{address}</span>
      </div>
      <div className={styles.contact}>
        <span className={styles.property}>Contact</span>
        <span className={styles.value}>{contact}</span>
      </div>
      <div className={styles.parentsContact}>
        <span className={styles.property}>Parent's Contact</span>
        <span className={styles.value}>{parentsContact}</span>
      </div>
      <div className={styles.buttons}>
        {/* <Button color="primary" onClick={onClickEdit}>Edit</Button>
    <Button color="error" onClick={onClickDelete}>Delete</Button> */}
      </div>
    </div>
  );
};

export default UserProfile;
