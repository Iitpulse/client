import { usePermission } from "../../utils/contexts/PermissionsContext";
import { PERMISSIONS } from "../../utils/constants";
import { Error } from "../";
import { Sidebar, NotificationCard } from "../../components";
import styles from "./Roles.module.scss";
import { Link } from "react-router-dom";
import add from "../../assets/icons/add.svg";
import member from "../../assets/icons/member.svg";
import kebabMenu from "../../assets/icons/kebabMenu.svg";
import { useEffect, useState } from "react";
import axios from "axios";
import AddNewRole from "./AddNewRole";

const Roles = () => {
  const isReadPermitted = usePermission(PERMISSIONS.BATCH.READ);
  console.log(isReadPermitted);
  const [roles, setRoles] = useState([]);
  const [newRoleModal, setNewRoleModal] = useState(false);

  useEffect(() => {
    async function getRoles() {
      const response = await axios.get("http://localhost:5000/roles/all");
      setRoles(response.data);
    }
    getRoles();
  }, []);

  return (
    <>
      {isReadPermitted ? (
        <>
          <div className={styles.roles}>
            <div className={styles.tableHeader}>
              <h4>Roles</h4>
              <h4>Members</h4>
              <img src={add} alt="" onClick={() => setNewRoleModal(true)} />
            </div>
            <div className={styles.tableContent}>
              {roles.map((role: any) => (
                <Link to={`/roles/${role.id}`}>
                  <p>Teacher</p>{" "}
                  <div className={styles.member}>
                    <img src={member} alt="Member" />
                    <p>{role.members?.length}</p>
                  </div>
                  <img src={kebabMenu} alt="Kebab Menu" />
                </Link>
              ))}
              {/* <Link to="/roles/teacher">
                <p>Teacher</p>{" "}
                <div className={styles.member}>
                  <img src={member} alt="Member" />
                  <p>34</p>
                </div>{" "}
                <img src={kebabMenu} alt="Kebab Menu" />
              </Link>
              <br />
              <Link to="/roles/operator">
                <p>Operator</p>{" "}
                <div className={styles.member}>
                  <img src={member} alt="Member" />
                  <p>34</p>
                </div>{" "}
                <img src={kebabMenu} alt="Kebab Menu" />
              </Link>
              <br />
              <Link to="/roles/manager">
                <p>Manager</p>{" "}
                <div className={styles.member}>
                  <img src={member} alt="Member" />
                  <p>34</p>
                </div>{" "}
                <img src={kebabMenu} alt="Kebab Menu" />
              </Link>
              <br />
              <Link to="/roles/student">
                <p>Student</p>{" "}
                <div className={styles.member}>
                  <img src={member} alt="Member" />
                  <p>34</p>
                </div>{" "}
                <img src={kebabMenu} alt="Kebab Menu" />
              </Link>
              <br />
              <Link to="/roles/admin">
                <p>Admin</p>{" "}
                <div className={styles.member}>
                  <img src={member} alt="Member" />
                  <p>34</p>
                </div>{" "}
                <img src={kebabMenu} alt="Kebab Menu" />
              </Link> */}
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
