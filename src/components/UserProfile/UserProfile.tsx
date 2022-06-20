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
    // cons ole.log(userType);
  });
  if (userType === "student" && selectedUsers.length > 0) {
    if (selectedUsers.length === 1) {
      return (
        <>
          <StudentSideMenu selectedUsers={selectedUsers} />
        </>
      );
    }
  }

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
    parentDetails,
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
      parentDetails
    );
  });

  return (
    <div className={styles.student}>
      {/* <span className={clsx(styles.value, styles.id)}>{id}</span> */}
      <img className={styles.avatar} src={avatar} alt={name} />
      <p className={styles.name}>{name}</p>
      <p className={styles.value}>{batch}</p>
      <div className={styles.icons}>
        <IconButton>
          <img src={phone} alt="Phone" />
        </IconButton>
        <IconButton>
          <img src={mail} alt="Email" />
        </IconButton>
      </div>
      <div className={styles.class}>
        <p className={styles.property}>Class</p>
        <p className={styles.value}>{standard ? standard + "th" : "12th"}</p>
      </div>
      <div className={styles.course}>
        <p className={styles.property}>Course</p>
        <p className={styles.value}>{course ? course : "NEET_BLOCKBUSTER21"}</p>
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
          <p className={styles.value}>{DOB ? DOB : "02/06/2001"}</p>
        </div>
      </div>
      <div className={styles.address}>
        <p className={styles.property}>Address</p>
        <p className={styles.value}>
          {address
            ? address
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
        <Button color="primary">Edit</Button>
        <Button color="error">Delete</Button>
      </div>
    </div>
  );
};

export default UserProfile;
