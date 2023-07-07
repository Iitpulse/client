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
import { CalendarOutlined } from "@ant-design/icons";
import {
  AccountCircleOutlined,
  AccountCircleRounded,
  CallOutlined,
  CottageOutlined,
  EmailOutlined,
  EventNoteRounded,
} from "@mui/icons-material";

const UserProfile: React.FC<{
  user: any;
  handleEditModal: () => void;
  handleDeleteModal: () => void;
}> = ({ handleEditModal, handleDeleteModal, user }) => {
  const [userType, setUserType] = useState<
    "student" | "teacher" | "admin" | "superadmin" | "manager" | "operator" | ""
  >("");
  console.log(user);
  if (user.userType === "student") {
    return (
      <>
        <SideMenu
          handleEditModal={handleEditModal}
          handleDeleteModal={handleDeleteModal}
          user={user}
        />
      </>
    );
  } else {
    return (
      <>
        <SideMenu
          handleEditModal={handleEditModal}
          handleDeleteModal={handleDeleteModal}
          user={user}
        />
      </>
    );
  }

  return <>{/* <StudentSideMenu student={props.user} /> */}</>;
};

interface SideMenuProps {
  user: any;
  handleEditModal: () => void;
  handleDeleteModal: () => void;
}

const SideMenu = (props: SideMenuProps) => {
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
    userType,
  } = props.user;

  return (
    <>
      <div className={styles.student}>
        <div className={styles.basicDetailContainer}>
          <div className={styles.avatarContainer}>
            <img src={avatar} alt="avatar" className={styles.avatar} />
          </div>
          <div className={styles.basicDetail}>
            <p className={styles.name}>{name}</p>
            <p className={styles.ageNgender}>
              ({age} {gender})
            </p>
          </div>
        </div>

        <div className={styles.contact}>
          <IconButton href={"tel:+91" + contact}>
            <img src={phone} alt="Phone" />
          </IconButton>
          <IconButton
            target="_blank"
            href={"https://mail.google.com/mail/?view=cm&fs=1&to=" + email}
          >
            <img src={mail} alt="Email" />
          </IconButton>
          <div className={styles.line}></div>
        </div>

        <div className={styles.detailContainer}>
          <p className={styles.heading} style={{ textTransform: "capitalize" }}>
            {userType} Details
          </p>

          <div className={styles.detail}>
            {userType === "student" && <p className={styles.key}>Roll No.</p>}
            {userType === "student" && <p className={styles.value}>20T2121</p>}
            {batch && <p className={styles.key}>Batch</p>}
            {batch && <p className={styles.value}>{batch}</p>}
            {standard && <p className={styles.key}>Class</p>}
            {standard && <p className={styles.value}>{standard}</p>}
            {stream && <p className={styles.key}>Course</p>}
            {stream && <p className={styles.value}>{stream}</p>}
          </div>
        </div>

        <div className={styles.detailContainer}>
          <p className={styles.heading}>About</p>

          <div className={styles.detail}>
            {dob && (
              <p className={styles.key}>
                <EventNoteRounded />
              </p>
            )}
            {dob && <p className={styles.value}>{dob}</p>}
            {contact && (
              <p className={styles.key}>
                <CallOutlined />
              </p>
            )}
            {contact && <p className={styles.value}>{contact}</p>}
            {currentAddress && (
              <p className={styles.key}>
                <CottageOutlined />
              </p>
            )}
            {currentAddress && <p className={styles.value}>{currentAddress}</p>}
            {email && (
              <p className={styles.key}>
                <EmailOutlined />
              </p>
            )}

            {email && <p className={styles.value}>{email}</p>}
          </div>
        </div>

        {parentDetails && (
          <div className={styles.detailContainer}>
            <p className={styles.heading}>Parent Details</p>

            <div className={styles.detail}>
              <p className={styles.key}>
                <AccountCircleOutlined />
              </p>
              <p className={styles.value}>{parentDetails?.name}</p>
              <p className={styles.key}>
                <CallOutlined />
              </p>

              <p className={styles.value}>{parentDetails?.contact}</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

interface TeacherSideMenuProps {
  user: any;
  handleEditModal: () => void;
  handleDeleteModal: () => void;
}

const TeacherSideMenu = (props: TeacherSideMenuProps) => {
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
  } = props.user;

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
      </div>
    </>
  );
};

export default UserProfile;
