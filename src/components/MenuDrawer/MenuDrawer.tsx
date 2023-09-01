import styles from "./MenuDrawer.module.scss";
import { useContext, useEffect, useLayoutEffect, useState } from "react";
import logo from "../../assets/images/logo.svg";
import dropdown from "../../assets/icons/dropdown.svg";
import collapse from "../../assets/icons/collapse.svg";
import profilePlaceholder from "../../assets/images/profilePlaceholder.jpg";
import institutePlaceholder from "../../assets/images/institutePlaceholder.svg";
import { NavLink, useNavigate } from "react-router-dom";
import { Box, IconButton, Skeleton } from "@mui/material";
import { Menu, MenuItem } from "@mui/material";
import clsx from "clsx";
import { AUTH_TOKEN, PERMISSIONS } from "../../utils/constants";
import {
  PermissionsContext,
  usePermission,
} from "../../utils/contexts/PermissionsContext";
import { AuthContext } from "../../utils/auth/AuthContext";
import { ReactComponent as HomeIcon } from "../../assets/icons/home.svg";
import { ReactComponent as QuestionsIcon } from "../../assets/icons/questions.svg";
import { ReactComponent as UsersIcon } from "../../assets/icons/users.svg";
import { ReactComponent as PatternIcon } from "../../assets/icons/pattern.svg";
import { ReactComponent as TestsIcon } from "../../assets/icons/test.svg";
import { ReactComponent as BatchesIcon } from "../../assets/icons/batch.svg";
import { ReactComponent as RolesIcon } from "../../assets/icons/roles.svg";
import { ReactComponent as Settings } from "../../assets/icons/settings.svg";
import MenuIcon from "@mui/icons-material/Menu";
import { BookOutlined, SettingOutlined } from "@ant-design/icons";

interface MenuDrawerProps {
  [x: string]: any;
}

const MenuDrawer = (props: MenuDrawerProps) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const navigate = useNavigate();
  const { currentUser, setCurrentUser } = useContext<any>(AuthContext);
  const { hasPermissions, loading } = useContext(PermissionsContext);

  // const hasQuestionPermission: boolean = usePermission(
  //   PERMISSIONS.QUESTION.READ
  // );
  // const hasUsersPermission: boolean = usePermission(PERMISSIONS.USER.READ);
  // const hasTestPermission: boolean = usePermission(PERMISSIONS.TEST.READ);
  // const hasPatternPermission: boolean = usePermission(PERMISSIONS.PATTERN.READ);
  // const hasBatchPermission: boolean = usePermission(PERMISSIONS.BATCH.READ);
  // const hasRolePermission: boolean = usePermission(PERMISSIONS.ROLE.READ);

  // const [hasPermissions, setHasPermissions] = useState({
  //   hasQuestionPermission: false,
  //   hasUsersPermission: false,
  //   hasTestPermission: false,
  //   hasPatternPermission: false,
  //   hasBatchPermission: false,
  //   hasRolePermission: false,
  // });

  // useEffect(() => {
  //   setHasPermissions({
  //     hasQuestionPermission,
  //     hasUsersPermission,
  //     hasTestPermission,
  //     hasPatternPermission,
  //     hasBatchPermission,
  //     hasRolePermission,
  //   });
  // }, [
  //   hasQuestionPermission,
  //   hasUsersPermission,
  //   hasTestPermission,
  //   hasPatternPermission,
  //   hasBatchPermission,
  //   hasRolePermission,
  // ]);

  // useEffect(() => {
  //   console.log({ loading, hasPermissions });
  // }, [hasPermissions, loading]);

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

  function checkIfNavLinkIsActive(path: string) {
    return window.location.pathname === path;
  }

  return (
    <div
      style={isCollapsed ? { width: "fit-content", padding: "0 1rem" } : {}}
      className={styles.container}
    >
      <section
        style={isCollapsed ? { justifyContent: "center" } : {}}
        className={styles.topContainer}
      >
        <IconButton onClick={() => setIsCollapsed((prev) => !prev)}>
          {" "}
          <MenuIcon />
        </IconButton>
        {isCollapsed || (
          <NavLink to="/">
            <div className={styles.imageContainer}>
              <img src={logo} alt={logo} />
            </div>
          </NavLink>
        )}
      </section>

      <section
        style={isCollapsed ? { padding: "0rem" } : {}}
        className={styles.navLinksContainer}
      >
        <NavLink
          style={isCollapsed ? { width: "fit-content" } : {}}
          className={
            checkIfNavLinkIsActive("/")
              ? clsx(styles.navLink, styles.activeNavLink)
              : styles.navLink
          }
          to="/"
        >
          <div className={styles.iconContainer}>
            <HomeIcon />
          </div>{" "}
          {isCollapsed || <span>Home</span>}
        </NavLink>
        {loading && (
          <Box sx={{ width: "100%" }}>
            <Skeleton height={55} />
            <Skeleton height={55} />
            <Skeleton height={55} />
            <Skeleton height={55} />
            <Skeleton height={55} />
            <Skeleton height={55} />
          </Box>
        )}
        {hasPermissions?.hasQuestionPermission && (
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
              <QuestionsIcon />
            </div>{" "}
            {isCollapsed || <span>Questions</span>}
          </NavLink>
        )}
        {hasPermissions?.hasUsersPermission && (
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
              <UsersIcon />
            </div>{" "}
            {isCollapsed || <span>Users</span>}
          </NavLink>
        )}
        {/* chnages yaha */}
        {currentUser?.userType === "student" ? (
          <NavLink
            style={isCollapsed ? { width: "fit-content" } : {}}
            to="/ongoing-test"
            className={({ isActive }) =>
              isActive
                ? clsx(styles.navLink, styles.activeNavLink)
                : styles.navLink
            }
          >
            <div className={styles.iconContainer}>
              <TestsIcon />
            </div>{" "}
            {isCollapsed || <span>Ongoing Test</span>}
          </NavLink>
        ) : (
          hasPermissions?.hasTestPermission && (
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
                <TestsIcon />
              </div>{" "}
              {isCollapsed || <span>Test</span>}
            </NavLink>
          )
        )}
        {currentUser?.userType === "student" && (
          <NavLink
            style={isCollapsed ? { width: "fit-content" } : {}}
            to="/upcoming-test"
            className={({ isActive }) =>
              isActive
                ? clsx(styles.navLink, styles.activeNavLink)
                : styles.navLink
            }
          >
            <div className={styles.iconContainer}>
              <TestsIcon />
            </div>{" "}
            {isCollapsed || <span>Upcoming Test</span>}
          </NavLink>
        )}
        {hasPermissions?.hasPatternPermission && (
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
              <PatternIcon />
            </div>{" "}
            {isCollapsed || <span>Pattern</span>}
          </NavLink>
        )}
        {hasPermissions?.hasBatchPermission && (
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
              <BatchesIcon />
            </div>{" "}
            {isCollapsed || <span>Batches</span>}
          </NavLink>
        )}
        {hasPermissions?.hasRolePermission && (
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
              <RolesIcon />
            </div>{" "}
            {isCollapsed || <span>Roles</span>}
          </NavLink>
        )}
        {hasPermissions?.hasRolePermission && (
          <NavLink
            to="/institutes"
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
              <HomeIcon
                style={{
                  fontSize: "1.2rem",
                }}
              />
            </div>{" "}
            {isCollapsed || <span>Intitutes</span>}
          </NavLink>
        )}
        {hasPermissions?.hasRolePermission && (
          <NavLink
            to="/subjects"
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
              <SettingOutlined
                style={{
                  fontSize: "1.2rem",
                }}
              />
            </div>{" "}
            {isCollapsed || <span>Misc</span>}
          </NavLink>
        )}

        {/* {currentUser?.id && (
          <NavLink
            to={`/profile/${currentUser?.id}`}
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
              <UsersIcon />
            </div>{" "}
            {isCollapsed || <span>My Profile</span>}
          </NavLink>
        )} */}
      </section>
      {isCollapsed || <div className={styles.divider}></div>}
      {/* {isCollapsed || (
        <section className={styles.instituteInfoContainer}>
          <div className={styles.imageContainer}>
            <img src={institutePlaceholder} alt={institutePlaceholder} />
          </div>
          <span>Institute of Engineering {"&"} Technology, Indore</span>
        </section>
      )} */}
      <div className={styles.divider}></div>
      <Profile
        isCollapsed={isCollapsed}
        image={profilePlaceholder}
        email={currentUser?.email || "User"}
        userType={currentUser?.userType || "NA"}
        id={currentUser?.id || ""}
      />
    </div>
  );
};

interface ProfileProps {
  image: string;
  email: string;
  userType: string;
  isCollapsed: boolean;
  id: string;
}

const Profile = (props: ProfileProps) => {
  const navigate = useNavigate();
  function handleProfileView() {
    navigate(`/profile/${props.id}`);
  }
  return (
    <>
      <div
        style={
          props.isCollapsed
            ? { width: "fit-content", flexDirection: "column" }
            : {}
        }
        className={styles.profileContainer}
      >
        <div className={styles.profileContainer2} onClick={handleProfileView}>
          <div
            style={props.isCollapsed ? { margin: "auto" } : {}}
            className={styles.imageContainer}
          >
            <img src={props.image} alt={props.image} />
          </div>

          {props.isCollapsed || (
            <div className={styles.textContainer}>
              <span>{props.email}</span>
              <span>({props.userType})</span>
            </div>
          )}
        </div>
        <ProfileOptionsMenu
          id={props.id}
          style={props.isCollapsed ? { margin: "auto" } : {}}
        />
      </div>
    </>
  );
};

interface ProfileOptionMenuProps {
  id: string;
  style?: HTMLStyleElement | any;
}

const ProfileOptionsMenu = (props: ProfileOptionMenuProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const { resetPermissions } = useContext(PermissionsContext);
  const { setCurrentUser } = useContext(AuthContext);

  const handleClose = () => {
    setAnchorEl(null);
  };

  function handleClickLogout() {
    setAnchorEl(null);
    resetPermissions();
    setCurrentUser(null);
    localStorage.removeItem(AUTH_TOKEN);

    navigate("/login");
    window.location.reload();
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
        {/* <MenuItem onClick={handleClose}>My account</MenuItem> */}
        {/* <MenuItem > <NavLink to={`/profile/${props.currentUser?.id}`}> Profile </NavLink></MenuItem> */}
        <MenuItem
          onClick={() => {
            navigate(`/profile/${props.id}`);
          }}
        >
          Profile
        </MenuItem>
        <MenuItem onClick={handleClickLogout}>Logout</MenuItem>
      </Menu>
    </div>
  );
};

export default MenuDrawer;
