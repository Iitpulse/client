import {
  PermissionsContext,
  usePermission,
} from "../../utils/contexts/PermissionsContext";
import { PERMISSIONS } from "../../utils/constants";
import { Error } from "../";
import { Button } from "antd";
import styles from "./Roles.module.scss";
import { Link } from "react-router-dom";
import member from "../../assets/icons/member.svg";
import kebabMenu from "../../assets/icons/kebabMenu.svg";
import { useCallback, useContext, useState } from "react";
import AddNewRoleSidebar from "./AddNewRole";
import { Menu, MenuItem, IconButton } from "@mui/material";
import MainLayout from "../../layouts/MainLayout";
import { Add as AddIcon } from "@mui/icons-material";
import { message } from "antd";
import deleteIcon from "../../assets/icons/delete.svg";

const Roles = () => {
  const hasPermission = usePermission(PERMISSIONS.ROLE.READ);
  const [isOpenAddNewRole, setIsOpenAddNewRole] = useState(false);
  const { allRoles } = useContext(PermissionsContext);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const { deleteRole } = useContext(PermissionsContext);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  function handleCloseIsOpenAddNewRole() {
    setIsOpenAddNewRole(false);
  }

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleDeleteRole = useCallback(
    (id: string) => {
      try {
        const res = deleteRole(id);
        // console.log(res);
        res
          .then((res) => {
            message.success("Role deleted successfully");
          })
          .catch((e) => {
            message.error("Something wrong occured");
          });
      } catch (err) {
        message.error("Something wrong occured");
        console.log(err);
      }
      handleClose();
    },
    [deleteRole]
  );

  return (
    <MainLayout
      name="Roles"
      menuActions={
        hasPermission ? (
          <Button
            type="primary"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={() => setIsOpenAddNewRole(true)}
            icon={<AddIcon />}
          >
            Create New
          </Button>
        ) : null
      }
    >
      {hasPermission ? (
        <>
          <div className={styles.roles}>
            <div className={styles.tableHeader}>
              <h4>Roles</h4>
              <h4>Members</h4>
            </div>
            <div className={styles.tableContent}>
              {allRoles?.map((role: any) => (
                <div key={role.id} className={styles.memberContainer}>
                  <Link key={role.id} to={`/roles/${role.id}`}>
                    <p>{role?.name}</p>{" "}
                    <div className={styles.member}>
                      <img src={member} alt="Member" />
                      <p>{role.members?.length}</p>
                    </div>
                  </Link>

                  <IconButton
                    onClick={() => {
                      handleDeleteRole(role.id);
                    }}
                  >
                    <img src={deleteIcon} />
                  </IconButton>
                </div>
              ))}
            </div>
          </div>
          {/* <Sidebar
            title="Create New Role"
            open={isOpenAddNewRole}
            width="30%"
            handleClose={handleCloseIsOpenAddNewRole}
          </Sidebar> */}

          <AddNewRoleSidebar
            open={isOpenAddNewRole}
            handleClose={handleCloseIsOpenAddNewRole}
          />
        </>
      ) : (
        <Error />
      )}
    </MainLayout>
  );
};

export default Roles;
