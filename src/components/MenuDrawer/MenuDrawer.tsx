import styles from "./MenuDrawer.module.scss";
import { useEffect, useLayoutEffect, useState } from "react";
import logo from "../../assets/images/logo.svg";
import dropdown from "../../assets/icons/dropdown.svg";
import collapse from "../../assets/icons/collapse.svg";
import profilePlaceholder from "../../assets/images/profilePlaceholder.jpg";
import institutePlaceholder from "../../assets/images/institutePlaceholder.svg";
import { NavLink, useNavigate } from "react-router-dom";
import { IconButton } from "@mui/material";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import clsx from "clsx";

interface MenuDrawerProps {
  [x: string]: any;
}

const MenuDrawer = (props: MenuDrawerProps) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  useEffect(() => {
    // Close the menu drawer if width is <= 1300px
    setIsCollapsed(window.innerWidth <= 1300);
  }, []);

  useLayoutEffect(() => {
    function handleResize() {
      // Close the menu drawer if width is <= 1300px
      setIsCollapsed(window.innerWidth <= 1300);
    }

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div
      style={isCollapsed ? { width: "fit-content", padding: "0 1rem" } : {}}
      className={styles.container}
    >
      <section
        style={isCollapsed ? { justifyContent: "center" } : {}}
        className={styles.topContainer}
      >
        {isCollapsed || (
          <NavLink to="/">
            {" "}
            <div className={styles.imageContainer}>
              <img src={logo} alt={logo} />
            </div>
          </NavLink>
        )}
        <IconButton onClick={() => setIsCollapsed((prev) => !prev)}>
          {" "}
          <img
            style={isCollapsed ? { transform: "rotate(180deg)" } : {}}
            src={collapse}
            alt={collapse}
          />
        </IconButton>
      </section>

      <section
        style={isCollapsed ? { padding: "0rem" } : {}}
        className={styles.navLinksContainer}
      >
        <NavLink
          style={isCollapsed ? { width: "fit-content" } : {}}
          className={({ isActive }) =>
            isActive
              ? clsx(styles.navLink, styles.activeNavLink)
              : styles.navLink
          }
          to="/"
        >
          <div className={styles.iconContainer}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M9.02 2.84004L3.63 7.04004C2.73 7.74004 2 9.23004 2 10.36V17.77C2 20.09 3.89 21.99 6.21 21.99H17.79C20.11 21.99 22 20.09 22 17.78V10.5C22 9.29004 21.19 7.74004 20.2 7.05004L14.02 2.72004C12.62 1.74004 10.37 1.79004 9.02 2.84004Z"
                stroke="#555555"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12 17.99V14.99"
                stroke="#555555"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>{" "}
          {isCollapsed || <span>Home</span>}
        </NavLink>
        <NavLink
          style={isCollapsed ? { width: "fit-content" } : {}}
          to="/questions"
          className={({ isActive }) =>
            isActive
              ? clsx(styles.navLink, styles.activeNavLink)
              : styles.navLink
          }
        >
          <div className={styles.iconContainer}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M11 19.5H21"
                stroke="#555555"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M11 12.5H21"
                stroke="#555555"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M11 5.5H21"
                stroke="#555555"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M3 5.5L4 6.5L7 3.5"
                stroke="#555555"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M3 12.5L4 13.5L7 10.5"
                stroke="#555555"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M3 19.5L4 20.5L7 17.5"
                stroke="#555555"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>{" "}
          {isCollapsed || <span>Questions</span>}
        </NavLink>
        <NavLink
          style={isCollapsed ? { width: "fit-content" } : {}}
          to="/users"
          className={({ isActive }) =>
            isActive
              ? clsx(styles.navLink, styles.activeNavLink)
              : styles.navLink
          }
        >
          <div className={styles.iconContainer}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M9.15957 10.87C9.05957 10.86 8.93957 10.86 8.82957 10.87C6.44957 10.79 4.55957 8.84 4.55957 6.44C4.55957 3.99 6.53957 2 8.99957 2C11.4496 2 13.4396 3.99 13.4396 6.44C13.4296 8.84 11.5396 10.79 9.15957 10.87Z"
                stroke="#555555"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M16.4103 4C18.3503 4 19.9103 5.57 19.9103 7.5C19.9103 9.39 18.4103 10.93 16.5403 11C16.4603 10.99 16.3703 10.99 16.2803 11"
                stroke="#555555"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M4.15973 14.56C1.73973 16.18 1.73973 18.82 4.15973 20.43C6.90973 22.27 11.4197 22.27 14.1697 20.43C16.5897 18.81 16.5897 16.17 14.1697 14.56C11.4297 12.73 6.91973 12.73 4.15973 14.56Z"
                stroke="#555555"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M18.3398 20C19.0598 19.85 19.7398 19.56 20.2998 19.13C21.8598 17.96 21.8598 16.03 20.2998 14.86C19.7498 14.44 19.0798 14.16 18.3698 14"
                stroke="#555555"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>{" "}
          {isCollapsed || <span>Users</span>}
        </NavLink>

        <NavLink
          style={isCollapsed ? { width: "fit-content" } : {}}
          to="/test"
          className={({ isActive }) =>
            isActive
              ? clsx(styles.navLink, styles.activeNavLink)
              : styles.navLink
          }
        >
          <div className={styles.iconContainer}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M20 8.25V18C20 21 18.21 22 16 22H8C5.79 22 4 21 4 18V8.25C4 5 5.79 4.25 8 4.25C8 4.87 8.24997 5.43 8.65997 5.84C9.06997 6.25 9.63 6.5 10.25 6.5H13.75C14.99 6.5 16 5.49 16 4.25C18.21 4.25 20 5 20 8.25Z"
                stroke="#555555"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M16 4.25C16 5.49 14.99 6.5 13.75 6.5H10.25C9.63 6.5 9.06997 6.25 8.65997 5.84C8.24997 5.43 8 4.87 8 4.25C8 3.01 9.01 2 10.25 2H13.75C14.37 2 14.93 2.25 15.34 2.66C15.75 3.07 16 3.63 16 4.25Z"
                stroke="#555555"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M8 13H12"
                stroke="#555555"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M8 17H16"
                stroke="#555555"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>{" "}
          {isCollapsed || <span>Test</span>}
        </NavLink>
        <NavLink
          style={isCollapsed ? { width: "fit-content" } : {}}
          to="/pattern"
          className={({ isActive }) =>
            isActive
              ? clsx(styles.navLink, styles.activeNavLink)
              : styles.navLink
          }
        >
          <div className={styles.iconContainer}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M8 2V5"
                stroke="#555555"
                strokeWidth={1.5}
                strokeMiterlimit={10}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M16 2V5"
                stroke="#555555"
                strokeWidth={1.5}
                strokeMiterlimit={10}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M21 8.5V13.63C20.11 12.92 18.98 12.5 17.75 12.5C16.52 12.5 15.37 12.93 14.47 13.66C13.26 14.61 12.5 16.1 12.5 17.75C12.5 18.73 12.78 19.67 13.26 20.45C13.63 21.06 14.11 21.59 14.68 22H8C4.5 22 3 20 3 17V8.5C3 5.5 4.5 3.5 8 3.5H16C19.5 3.5 21 5.5 21 8.5Z"
                stroke="#555555"
                strokeWidth={1.5}
                strokeMiterlimit={10}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M7 11H13"
                stroke="#555555"
                strokeWidth={1.5}
                strokeMiterlimit={10}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M7 16H9.62"
                stroke="#555555"
                strokeWidth={1.5}
                strokeMiterlimit={10}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M23 17.75C23 18.73 22.72 19.67 22.24 20.45C21.96 20.93 21.61 21.35 21.2 21.69C20.28 22.51 19.08 23 17.75 23C16.6 23 15.54 22.63 14.68 22C14.11 21.59 13.63 21.06 13.26 20.45C12.78 19.67 12.5 18.73 12.5 17.75C12.5 16.1 13.26 14.61 14.47 13.66C15.37 12.93 16.52 12.5 17.75 12.5C18.98 12.5 20.11 12.92 21 13.63C22.22 14.59 23 16.08 23 17.75Z"
                stroke="#555555"
                strokeWidth={1.5}
                strokeMiterlimit={10}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M17.75 20.25C17.75 18.87 18.87 17.75 20.25 17.75C18.87 17.75 17.75 16.63 17.75 15.25C17.75 16.63 16.63 17.75 15.25 17.75C16.63 17.75 17.75 18.87 17.75 20.25Z"
                stroke="#555555"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>{" "}
          {isCollapsed || <span>Pattern</span>}
        </NavLink>
        <NavLink
          style={isCollapsed ? { width: "fit-content" } : {}}
          to="/batches"
          className={({ isActive }) =>
            isActive
              ? clsx(styles.navLink, styles.activeNavLink)
              : styles.navLink
          }
        >
          <div className={styles.iconContainer}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M18.0001 7.16C17.9401 7.15 17.8701 7.15 17.8101 7.16C16.4301 7.11 15.3301 5.98 15.3301 4.58C15.3301 3.15 16.4801 2 17.9101 2C19.3401 2 20.4901 3.16 20.4901 4.58C20.4801 5.98 19.3801 7.11 18.0001 7.16Z"
                stroke="#555555"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M16.9704 14.44C18.3404 14.67 19.8504 14.43 20.9104 13.72C22.3204 12.78 22.3204 11.24 20.9104 10.3C19.8404 9.59004 18.3104 9.35003 16.9404 9.59003"
                stroke="#555555"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M5.97047 7.16C6.03047 7.15 6.10047 7.15 6.16047 7.16C7.54047 7.11 8.64047 5.98 8.64047 4.58C8.64047 3.15 7.49047 2 6.06047 2C4.63047 2 3.48047 3.16 3.48047 4.58C3.49047 5.98 4.59047 7.11 5.97047 7.16Z"
                stroke="#555555"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M7.00043 14.44C5.63043 14.67 4.12043 14.43 3.06043 13.72C1.65043 12.78 1.65043 11.24 3.06043 10.3C4.13043 9.59004 5.66043 9.35003 7.03043 9.59003"
                stroke="#555555"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12.0001 14.63C11.9401 14.62 11.8701 14.62 11.8101 14.63C10.4301 14.58 9.33008 13.45 9.33008 12.05C9.33008 10.62 10.4801 9.46997 11.9101 9.46997C13.3401 9.46997 14.4901 10.63 14.4901 12.05C14.4801 13.45 13.3801 14.59 12.0001 14.63Z"
                stroke="#555555"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M9.08973 17.78C7.67973 18.72 7.67973 20.26 9.08973 21.2C10.6897 22.27 13.3097 22.27 14.9097 21.2C16.3197 20.26 16.3197 18.72 14.9097 17.78C13.3197 16.72 10.6897 16.72 9.08973 17.78Z"
                stroke="#555555"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>{" "}
          {isCollapsed || <span>Batches</span>}
        </NavLink>
        <NavLink
          to="/roles"
          style={isCollapsed ? { width: "fit-content" } : {}}
          className={({ isActive }) =>
            isActive
              ? clsx(
                  styles.navLink,
                  styles.activeNavLink,
                  styles.activeNavLinkForRole
                )
              : styles.navLink
          }
        >
          <div className={styles.iconContainer}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M19.25 21C19.25 21.4142 19.5858 21.75 20 21.75C20.4142 21.75 20.75 21.4142 20.75 21H19.25ZM3.25 21C3.25 21.4142 3.58579 21.75 4 21.75C4.41421 21.75 4.75 21.4142 4.75 21H3.25ZM21.75 13C21.75 12.5858 21.4142 12.25 21 12.25C20.5858 12.25 20.25 12.5858 20.25 13H21.75ZM20.25 13.01C20.25 13.4242 20.5858 13.76 21 13.76C21.4142 13.76 21.75 13.4242 21.75 13.01H20.25ZM20.25 11C20.25 11.4142 20.5858 11.75 21 11.75C21.4142 11.75 21.75 11.4142 21.75 11H20.25ZM18.2727 7.37538C18.1716 7.77707 18.4153 8.18466 18.8169 8.28576C19.2186 8.38686 19.6262 8.14319 19.7273 7.7415L18.2727 7.37538ZM8 15.75H16V14.25H8V15.75ZM19.25 19V21H20.75V19H19.25ZM4.75 21V19H3.25V21H4.75ZM16 15.75C17.7949 15.75 19.25 17.2051 19.25 19H20.75C20.75 16.3766 18.6234 14.25 16 14.25V15.75ZM8 14.25C5.37665 14.25 3.25 16.3766 3.25 19H4.75C4.75 17.2051 6.20507 15.75 8 15.75V14.25ZM15.25 7C15.25 8.79493 13.7949 10.25 12 10.25V11.75C14.6234 11.75 16.75 9.62335 16.75 7H15.25ZM12 10.25C10.2051 10.25 8.75 8.79493 8.75 7H7.25C7.25 9.62335 9.37665 11.75 12 11.75V10.25ZM8.75 7C8.75 5.20507 10.2051 3.75 12 3.75V2.25C9.37665 2.25 7.25 4.37665 7.25 7H8.75ZM12 3.75C13.7949 3.75 15.25 5.20507 15.25 7H16.75C16.75 4.37665 14.6234 2.25 12 2.25V3.75ZM20.25 13V13.01H21.75V13H20.25ZM22.25 8.07792C22.25 8.4006 22.0911 8.56799 21.5576 8.9577C21.1132 9.28233 20.25 9.85086 20.25 11H21.75C21.75 10.7206 21.8868 10.5748 22.4424 10.1689C22.9089 9.82811 23.75 9.24875 23.75 8.07792H22.25ZM21 6.75C21.677 6.75 22.25 7.31284 22.25 8.07792H23.75C23.75 6.54779 22.5675 5.25 21 5.25V6.75ZM19.7273 7.7415C19.8701 7.17411 20.4015 6.75 21 6.75V5.25C19.7049 5.25 18.581 6.15033 18.2727 7.37538L19.7273 7.7415Z"
                fill="#555555"
              />
            </svg>
          </div>{" "}
          {isCollapsed || <span>Roles</span>}
        </NavLink>
      </section>
      {isCollapsed || <div className={styles.divider}></div>}
      {isCollapsed || (
        <section className={styles.instituteInfoContainer}>
          <div className={styles.imageContainer}>
            <img src={institutePlaceholder} alt={institutePlaceholder} />
          </div>
          <span>Institute of Engineering {"&"} Technology, Indore</span>
        </section>
      )}
      <div className={styles.divider}></div>
      <Profile
        isCollapsed={isCollapsed}
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
  isCollapsed: boolean;
}

const Profile = (props: ProfileProps) => {
  return (
    <div
      style={
        props.isCollapsed
          ? { width: "fit-content", flexDirection: "column", marginTop: "auto" }
          : {}
      }
      className={styles.profileContainer}
    >
      <div
        style={props.isCollapsed ? { margin: "auto" } : {}}
        className={styles.imageContainer}
      >
        <img src={props.image} alt={props.image} />
      </div>
      {props.isCollapsed || (
        <div className={styles.textContainer}>
          <span>{props.name}</span>
          <span>({props.userType})</span>
        </div>
      )}
      <ProfileOptionsMenu style={props.isCollapsed ? { margin: "auto" } : {}} />
    </div>
  );
};

interface ProfileOptionMenuProps {
  style?: HTMLStyleElement | any;
}

const ProfileOptionsMenu = (props: ProfileOptionMenuProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const navigate = useNavigate();

  const handleClose = () => {
    setAnchorEl(null);
  };

  function handleClickLogout() {
    setAnchorEl(null);
    localStorage.removeItem("token");
    return navigate("/login");
  }

  return (
    <div style={props.style} className={styles.profileOptionsMenuContainer}>
      <IconButton
        id="basic-button"
        aria-controls={open ? "basic-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={open ? "true" : undefined}
        onClick={handleClick}
      >
        <img src={dropdown} alt="Dropdown" />
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
        <MenuItem onClick={handleClickLogout}>Logout</MenuItem>
      </Menu>
    </div>
  );
};

export default MenuDrawer;
