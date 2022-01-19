import styles from "./MenuDrawer.module.scss";
import { useState } from "react";
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
import { IconButton } from "@mui/material";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";

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
        <IconButton>
          {" "}
          <img src={collapse} alt={collapse} />
        </IconButton>
      </section>

      <section className={styles.navLinksContainer}>
        <NavLink
          style={({ isActive }) =>
            isActive ? { color: "white", backgroundColor: "#61B4F1" } : {}
          }
          to="/"
          className={styles.navLink}
        >
          <div className={styles.iconContainer}>
            <img src={home} alt={home} />
          </div>{" "}
          <span>Home</span>
        </NavLink>
        <NavLink
          style={({ isActive }) =>
            isActive ? { color: "white", backgroundColor: "#61B4F1" } : {}
          }
          to="/questions"
          className={styles.navLink}
        >
          <div className={styles.iconContainer}>
            <img src={questions} alt="Questions" />
          </div>{" "}
          <span>Questions</span>
        </NavLink>
        <NavLink
          style={({ isActive }) =>
            isActive ? { color: "white", backgroundColor: "#61B4F1" } : {}
          }
          to="/users"
          className={styles.navLink}
        >
          <div className={styles.iconContainer}>
            <img src={users} alt="Users" />
          </div>{" "}
          <span>Users</span>
        </NavLink>
        <NavLink
          style={({ isActive }) =>
            isActive ? { color: "white", backgroundColor: "#61B4F1" } : {}
          }
          to="/test"
          className={styles.navLink}
        >
          <div className={styles.iconContainer}>
            <img src={test} alt="test" />
          </div>{" "}
          <span>Test</span>
        </NavLink>
        <NavLink
          style={({ isActive }) =>
            isActive ? { color: "white", backgroundColor: "#61B4F1" } : {}
          }
          to="/pattern"
          className={styles.navLink}
        >
          <div className={styles.iconContainer}>
            <img src={pattern} alt="Pattern" />
          </div>{" "}
          <span>Pattern</span>
        </NavLink>
        <NavLink
          style={({ isActive }) =>
            isActive ? { color: "white", backgroundColor: "#61B4F1" } : {}
          }
          to="/batches"
          className={styles.navLink}
        >
          <div className={styles.iconContainer}>
            <img src={batch} alt="Batches" />
          </div>{" "}
          <span>Batches</span>
        </NavLink>
        <NavLink
          style={({ isActive }) =>
            isActive ? { color: "white", backgroundColor: "#61B4F1" } : {}
          }
          to="/roles"
          className={styles.navLink}
        >
          <div className={styles.iconContainer}>
            <img src={roles} alt="Roles" />
          </div>{" "}
          <span>Roles</span>
        </NavLink>
      </section>
      <div className={styles.divider}></div>
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
      <ProfileOptionsMenu />
    </div>
  );
};

const ProfileOptionsMenu = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };
  return (
    <section className={styles.profileOptionsMenuContainer}>
      <IconButton
        id="basic-button"
        aria-controls={open ? "basic-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={open ? "true" : undefined}
        onClick={handleClick}
      >
        <img src={collapse} alt={collapse} />
      </IconButton>
      <Menu
        id="basic-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          "aria-labelledby": "basic-button",
        }}
      >
        <MenuItem onClick={handleClose}>My account</MenuItem>
        <MenuItem onClick={handleClose}>Logout</MenuItem>
      </Menu>
    </section>
  );
};

export default MenuDrawer;
