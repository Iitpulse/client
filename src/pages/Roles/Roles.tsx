import {
  PermissionsContext,
  usePermission,
} from "../../utils/contexts/PermissionsContext";
import { PERMISSIONS } from "../../utils/constants";
import { Error } from "../";
import { Sidebar, NotificationCard } from "../../components";
import styles from "./Roles.module.scss";
import { Link } from "react-router-dom";
import add from "../../assets/icons/add.svg";
import member from "../../assets/icons/member.svg";
import kebabMenu from "../../assets/icons/kebabMenu.svg";
import { useContext, useEffect, useState } from "react";
import axios from "axios";
import AddNewRole from "./AddNewRole";
import {  Menu, MenuItem, IconButton } from "@mui/material";


const Roles = () => {
  const hasPermission = usePermission(PERMISSIONS.ROLE.READ);
  // const [roles, setRoles] = useState([]);
  const [newRoleModal, setNewRoleModal] = useState(false);

  const { allRoles } = useContext(PermissionsContext);
 const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };
  return (
    <>
      {hasPermission ? (
        <>
          <div className={styles.roles}>
            <div className={styles.tableHeader}>
              <h4>Roles</h4>
              <h4>Members</h4>
              <img
                src={add}
                alt="add-new-role"
                onClick={() => setNewRoleModal(true)}
              />
            </div>
            <div className={styles.tableContent}>
              {allRoles?.map((role: any) => (
                <div className={styles.memberContainer}>
                  
                <Link key={role.id} to={`/roles/${role.id}`}>
                  <p>{role?.name}</p>{" "}
                  <div className={styles.member}>
                    <img src={member} alt="Member" />
                    <p>{role.members?.length}</p>
                  </div>
                </Link>
                <div>
                 <IconButton
              id="basic-button"
              aria-controls={open ? "basic-menu" : undefined}
              aria-haspopup="true"
              aria-expanded={open ? "true" : undefined}
              onClick={handleClick}
            >
              <img src={kebabMenu} alt="Kebab Menu" />
            </IconButton>

                </div>
                <Menu
            id="basic-menu"
            anchorEl={anchorEl}
            open={open}
            onClose={handleClose}
            MenuListProps={{
              "aria-labelledby": "basic-button",
            }}
          >
            <MenuItem onClick={handleClose}>Report a Problem </MenuItem>
          </Menu>
                </div>
              ))}
            </div>
          </div>
          <Sidebar title="Recent Activity">
            {Array(10)
              .fill(0)
              .map((_, i) => (
                <NotificationCard
                  key={i}
                  id="aasdadsd"
                  status={i % 2 === 0 ? "success" : "warning"}
                  title={"New Student Joined-" + i}
                  description="New student join IIT Pulse Anurag Pal - Dropper Batch"
                  createdAt="10 Jan, 2022"
                />
              ))}
          </Sidebar>
          <AddNewRole
            open={newRoleModal}
            handleClose={() => setNewRoleModal(false)}
          />
        </>
      ) : (
        <Error />
      )}
    </>
  );
};

export default Roles;
