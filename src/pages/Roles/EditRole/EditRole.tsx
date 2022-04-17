import { useContext, useEffect, useState } from "react";
import { useParams } from "react-router";
import { Tabs, Tab, IconButton } from "@mui/material";
import styles from "./EditRole.module.scss";
import {
  PermissionsContext,
  usePermission,
} from "../../../utils/contexts/PermissionsContext";
import { PERMISSIONS } from "../../../utils/constants";
import { Error } from "../../";
import {
  Sidebar,
  NotificationCard,
  ToggleButton,
  Button,
} from "../../../components";
import clsx from "clsx";
import axios from "axios";
import { flattendPermissions } from "../AddNewRole";
import ClearIcon from "@mui/icons-material/Clear";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && children}
    </div>
  );
}

const EditRole = () => {
  const { roleName } = useParams();
  const [tab, setTab] = useState(0);
  const [permissions, setPermissions] = useState<any>([]);
  const [allowedPermisions, setAllowedPermissions] = useState<any>([]);
  const isReadPermitted = usePermission(PERMISSIONS?.ROLE?.UPDATE);
  const [members, setMembers] = useState<{ name: string; id: string }[]>([]);

  const { permissions: rolePermissions, allRoles } =
    useContext(PermissionsContext);

  function handleChangeTab(event: React.ChangeEvent<{}>, newValue: number) {
    setTab(newValue);
  }

  // function getRoleInformation(roleName: string | undefined) {
  //   const response = {
  //     id: "ABC123",
  //     permission: {
  //       READ_QUESTION: {
  //         from: "Date",
  //         to: "Date",
  //         description: "Allows User to do something",
  //       },
  //       CREATE_QUESTION: {
  //         from: "Date",
  //         to: "Date",
  //         description: "Allows User to do something",
  //       },
  //       UPDATE_QUESTION: {
  //         from: "Date",
  //         to: "Date",
  //         description: "Allows User to do something",
  //       },
  //       READ_GLOBAL_QUESTION: {
  //         from: "Date",
  //         to: "Date",
  //         description: "Allows User to do something",
  //       },
  //       DELETE_QUESTION: {
  //         from: "Date",
  //         to: "Date",
  //         description: "Allows User to do something",
  //       },
  //       READ_USER: {
  //         from: "Date",
  //         to: "Date",
  //         description: "Allows User to do something",
  //       },
  //       CREATE_USER: {
  //         from: "Date",
  //         to: "Date",
  //         description: "Allows User to do something",
  //       },
  //       UPDATE_USER: {
  //         from: "Date",
  //         to: "Date",
  //         description: "Allows User to do something",
  //       },
  //       DELETE_USER: {
  //         from: "Date",
  //         to: "Date",
  //         description: "Allows User to do something",
  //       },

  //       READ_BATCH: {
  //         from: "Date",
  //         to: "Date",
  //         description: "Allows User to do something",
  //       },
  //       CREATE_BATCH: {
  //         from: "Date",
  //         to: "Date",
  //         description: "Allows User to do something",
  //       },
  //       UPDATE_BATCH: {
  //         from: "Date",
  //         to: "Date",
  //         description: "Allows User to do something",
  //       },
  //       DELETE_BATCH: {
  //         from: "Date",
  //         to: "Date",
  //         description: "Allows User to do something",
  //       },

  //       READ_PATTERN: {
  //         from: "Date",
  //         to: "Date",
  //         description: "Allows User to do something",
  //       },
  //       CREATE_PATTERN: {
  //         from: "Date",
  //         to: "Date",
  //         description: "Allows User to do something",
  //       },
  //       UPDATE_PATTERN: {
  //         from: "Date",
  //         to: "Date",
  //         description: "Allows User to do something",
  //       },
  //       DELETE_PATTERN: {
  //         from: "Date",
  //         to: "Date",
  //         description: "Allows User to do something",
  //       },
  //       READ_SUBJECT: {
  //         from: "Date",
  //         to: "Date",
  //         description: "Allows User to do something",
  //       },
  //       CREATE_SUBJECT: {
  //         from: "Date",
  //         to: "Date",
  //         description: "Allows User to do something",
  //       },
  //       UPDATE_SUBJECT: {
  //         from: "Date",
  //         to: "Date",
  //         description: "Allows User to do something",
  //       },
  //       DELETE_SUBJECT: {
  //         from: "Date",
  //         to: "Date",
  //         description: "Allows User to do something",
  //       },
  //       MANAGE_CHAPTER: {
  //         from: "Date",
  //         to: "Date",
  //         description: "Allows User to do something",
  //       },
  //       MANAGE_TOPIC: {
  //         from: "Date",
  //         to: "Date",
  //         description: "Allows User to do something",
  //       },
  //       READ_TEST: {
  //         from: "Date",
  //         to: "Date",
  //         description: "Allows User to do something",
  //       },
  //       READ_GLOBAL_TEST: {
  //         from: "Date",
  //         to: "Date",
  //         description: "Allows User to do something",
  //       },
  //       VIEW_RESULT: {
  //         from: "Date",
  //         to: "Date",
  //         description: "Allows User to do something",
  //       },
  //       PUBLISH_RESULT: {
  //         from: "Date",
  //         to: "Date",
  //         description: "Allows User to do something",
  //       },
  //       EXPORT_RESULT: {
  //         from: "Date",
  //         to: "Date",
  //         description: "Allows User to do something",
  //       },
  //       CREATE_TEST: {
  //         from: "Date",
  //         to: "Date",
  //         description: "Allows User to do something",
  //       },
  //       UPDATE_TEST: {
  //         from: "Date",
  //         to: "Date",
  //         description: "Allows User to do something",
  //       },
  //       DELETE_TEST: {
  //         from: "Date",
  //         to: "Date",
  //         description: "Allows User to do something",
  //       },
  //     },
  //   };
  //   setPermissionInformation(response);
  // }

  useEffect(() => {
    setPermissions(flattendPermissions());
  }, [roleName]);

  useEffect(() => {
    if (roleName && allRoles) {
      setMembers(
        allRoles.filter((role: any) => role.id === roleName)[0]?.members
      );
    }
  }, [allRoles, roleName]);

  useEffect(() => {
    if (rolePermissions && roleName && permissions?.length) {
      let perms = rolePermissions[roleName];
      if (perms) {
        setAllowedPermissions(perms.map((_: any) => permissions.indexOf(_)));
      }
    }
  }, [rolePermissions, roleName, permissions]);

  function handleChangePermission(idx: number, checked: boolean) {
    console.log({ idx, checked });
    if (checked) {
      setAllowedPermissions([...allowedPermisions, idx]);
    } else {
      setAllowedPermissions(
        allowedPermisions.filter((item: any) => item !== idx)
      );
    }
  }

  async function handleClickUpdate() {
    let newPerms = allowedPermisions.map((idx: number) => permissions[idx]);
    console.log({ newPerms });

    const res = await axios.post("http://localhost:5004/roles/update", {
      id: roleName,
      permissions: newPerms,
    });

    console.log({ res });
  }

  return (
    <>
      {isReadPermitted ? (
        <>
          <div className={styles.editRole}>
            <div className={styles.flexRow}>
              <p>{roleName}</p>
              <Button onClick={handleClickUpdate}>Update</Button>
            </div>
            <br />
            <Tabs value={tab} onChange={handleChangeTab}>
              <Tab label="Permissions" />
              <Tab label="Manage People" />
            </Tabs>
            <TabPanel value={tab} index={0}>
              <div className={clsx(styles.tabPanel, styles.permissions)}>
                {permissions.map((permission: string, index: number) => {
                  return (
                    <div key={index}>
                      <Permission
                        idx={index}
                        name={permission}
                        description={"This is description"}
                        isChecked={allowedPermisions.includes(index)}
                        handleChangePermission={handleChangePermission}
                      />
                      {<div className={styles.separationLine}></div>}
                    </div>
                  );
                })}
              </div>
            </TabPanel>
            <TabPanel value={tab} index={1}>
              <div className={clsx(styles.tabPanel, styles.managePeople)}>
                {members?.map((member: any) => (
                  <div className={styles.flexRow}>
                    <p>{member?.name}</p>
                    <IconButton>
                      <ClearIcon />
                    </IconButton>
                  </div>
                ))}
              </div>
            </TabPanel>
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
        </>
      ) : (
        <Error />
      )}
    </>
  );
};

interface PermissionProps {
  idx: number;
  name: string;
  description: string;
  isChecked: boolean;
  handleChangePermission: (idx: number, checked: boolean) => void;
}

export const Permission = (props: PermissionProps) => {
  const { idx, name, description, isChecked, handleChangePermission } = props;

  return (
    <div className={styles.permission}>
      <div className={styles.leftContent}>
        <h4>{name}</h4>

        <p>{description}</p>
      </div>
      <ToggleButton
        checked={isChecked}
        onChange={(checked) => handleChangePermission(idx, checked)}
      />
    </div>
  );
};

export default EditRole;
