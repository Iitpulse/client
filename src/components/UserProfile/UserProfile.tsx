import closeIcon from "../../assets/icons/close-circle.svg";
import avatar from "../../assets/images/profilePlaceholder.jpg";
import phone from "../../assets/icons/phone.svg";
import mail from "../../assets/icons/mail.svg";
import styles from "./UserProfile.module.scss";
interface UserProfileProps {
  onClickEdit: () => void;
  onClickDelete: () => void;
  studentUserObj: {};
}

const UserProfile = () => {
  return (
    <>
      <div className={styles.container}>
        <div className={styles.userDetails}>
          <p className={styles.id}>IITP_ST_01</p>
          <img src={avatar} alt="Avatar" className={styles.profile} />
          <p className={styles.name}>Anurag Pal</p>
          <p className={styles.code}>TLP31</p>
          <div className={styles.iconWrapper}>
            <img src={phone} alt="phone" />
            <img src={mail} alt="mail" />
          </div>

          <p className={styles.class}>class 12th</p>
          <p className={styles.course}>Course NEET_BLOCKBUSTER_2021</p>
          <div className={styles.wrapper}>
            <p className={styles.age}>
              Age <br /> <span>21</span>
            </p>
            <p className={styles.gender}>
              Gender <br />
              <span>Male</span>
            </p>
            <p className={styles.dob}>
              DOB <br />
              <span>03/32/2</span>
            </p>
          </div>
          <div>
            <p className={styles.address}>
              Address <br />
              <span>3, Lala Rajpat Rai Colony, Jawhar Chowk Road, Mumbai</span>
            </p>
            <p className={styles.contact}>
              Contact <br />
              9911223344
            </p>
            <p className={styles.parentContact}>
              Parent Contact <br /> <span>123123123</span>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default UserProfile;
