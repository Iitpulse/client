import styles from "./MenuDrawer.module.scss";
import logo from "../../assets/images/logo.svg";
import home from "../../assets/icons/home.svg";
import questions from "../../assets/icons/questions.svg";
import batch from "../../assets/icons/batch.svg";
import pattern from "../../assets/icons/pattern.svg";
import test from "../../assets/icons/test.svg";
import users from "../../assets/icons/users.svg";
import roles from "../../assets/icons/roles.svg";
import collapse from "../../assets/icons/collapse.svg";
import profilePlaceholder from "../../assets/images/profilePlaceholder.svg";
import institutePlaceholder from "../../assets/images/institutePlaceholder.svg";
import { NavLink } from "react-router-dom";

interface MenuDrawerProps {
  [x: string]: any;
}

const MenuDrawer = (props: MenuDrawerProps) => {
  return (
    <div className={styles.container}>
      <section className={styles.topContainer}>
        <NavLink to="/">
          {" "}
          <div className={styles.imageContainer}>
            <img src={logo} alt={logo} />
          </div>
        </NavLink>
        <div className={styles.iconContainer}>
          <img src={collapse} alt={collapse} />
        </div>
      </section>

      <section className={styles.navLinksContainer}>
        <NavLink to="/" className={styles.navLink}>
          <div className={styles.iconContainer}>
            <img src={home} alt={home} />
          </div>{" "}
          <span>Home</span>
        </NavLink>
        <NavLink to="/questions" className={styles.navLink}>
          <div className={styles.iconContainer}>
            <img src={questions} alt="Questions" />
          </div>{" "}
          <span>Questions</span>
        </NavLink>
        <NavLink to="/users" className={styles.navLink}>
          <div className={styles.iconContainer}>
            <img src={users} alt="Users" />
          </div>{" "}
          <span>Users</span>
        </NavLink>
        <NavLink to="/test" className={styles.navLink}>
          <div className={styles.iconContainer}>
            <img src={test} alt="test" />
          </div>{" "}
          <span>Test</span>
        </NavLink>
        <NavLink to="/pattern" className={styles.navLink}>
          <div className={styles.iconContainer}>
            <img src={pattern} alt="Pattern" />
          </div>{" "}
          <span>Pattern</span>
        </NavLink>
        <NavLink to="/batches" className={styles.navLink}>
          <div className={styles.iconContainer}>
            <img src={batch} alt="Batches" />
          </div>{" "}
          <span>Batch</span>
        </NavLink>
        <NavLink to="/roles" className={styles.navLink}>
          <div className={styles.iconContainer}>
            <img src={roles} alt="Roles" />
          </div>{" "}
          <span>Roles</span>
        </NavLink>
      </section>
      <section className={styles.instituteInfoContainer}>
        <div className={styles.imageContainer}>
          <img src={institutePlaceholder} alt={institutePlaceholder} />
        </div>
        <span>Institute of Engineering {"&"} Technology, Indore</span>
      </section>
      <div className={styles.divider}></div>
      <Profile
        image={profilePlaceholder}
        name={"Shishir Tiwari"}
        userType={"Admin"}
      />
    </div>
  );
};

interface ProfileProps {
  image: string;
  name: string;
  userType: string;
}

const Profile = (props: ProfileProps) => {
  return (
    <div className={styles.profileContainer}>
      <div className={styles.imageContainer}>
        <img src={props.image} alt={props.image} />
      </div>
      <div className={styles.textContainer}>
        <span>{props.name}</span>
        <span>({props.userType})</span>
      </div>
    </div>
  );
};

export default MenuDrawer;
