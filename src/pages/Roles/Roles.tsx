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

const Roles = () => {
  const hasPermission = usePermission(PERMISSIONS.ROLE.READ);
  const [roles, setRoles] = useState([]);
  const [newRoleModal, setNewRoleModal] = useState(false);

  const { setPermissions } = useContext(PermissionsContext);

  useEffect(() => {
    async function getRoles() {
      const response = await axios.get("http://localhost:5000/roles/all");
      setRoles(response.data);
      // console.log(response.data);
      let perms: any = {};
      response.data.forEach((role: any) => {
        perms[role.id] = role.permissions;
      });
      console.log({ perms });
      setPermissions(perms);
    }
    getRoles();
  }, []);

  return (
    <>
      {true || hasPermission ? (
        <>
          <div className={styles.roles}>
            <div className={styles.tableHeader}>
              <h4>Roles</h4>
              <h4>Members</h4>
              <img src={add} alt="" onClick={() => setNewRoleModal(true)} />
            </div>
            <div className={styles.tableContent}>
              {roles.map((role: any) => (
                <Link key={role.id} to={`/roles/${role.id}`}>
                  <p>{role?.name}</p>{" "}
                  <div className={styles.member}>
                    <img src={member} alt="Member" />
                    <p>{role.members?.length}</p>
                  </div>
                  <img src={kebabMenu} alt="Kebab Menu" />
                </Link>
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
