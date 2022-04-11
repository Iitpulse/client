import { useContext, useEffect, useState } from "react";
import { useParams } from "react-router";
import { Tabs, Tab } from "@mui/material";
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

const EditRole = () => {
  const { roleName } = useParams();
  const [tab, setTab] = useState(0);
  const [permissionInformation, setPermissionInformation] = useState<any>({});
  const [permissions, setPermissions] = useState<any>([]);
  const [allowedPermisions, setAllowedPermissions] = useState<any>([]);
  const isReadPermitted = usePermission(PERMISSIONS?.ROLE?.UPDATE);

  const { permissions: rolePermissions } = useContext(PermissionsContext);

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
  function handleChangeTab(event: React.ChangeEvent<{}>, newValue: number) {
    setTab(newValue);
  }

  function getRoleInformation(roleName: string | undefined) {
    const response = {
      id: "ABC123",
      permission: {
        READ_QUESTION: {
          from: "Date",
          to: "Date",
          description: "Allows User to do something",
        },
        CREATE_QUESTION: {
          from: "Date",
          to: "Date",
          description: "Allows User to do something",
        },
        UPDATE_QUESTION: {
          from: "Date",
          to: "Date",
          description: "Allows User to do something",
        },
        READ_GLOBAL_QUESTION: {
          from: "Date",
          to: "Date",
          description: "Allows User to do something",
        },
        DELETE_QUESTION: {
          from: "Date",
          to: "Date",
          description: "Allows User to do something",
        },
        READ_USER: {
          from: "Date",
          to: "Date",
          description: "Allows User to do something",
        },
        CREATE_USER: {
          from: "Date",
          to: "Date",
          description: "Allows User to do something",
        },
        UPDATE_USER: {
          from: "Date",
          to: "Date",
          description: "Allows User to do something",
        },
        DELETE_USER: {
          from: "Date",
          to: "Date",
          description: "Allows User to do something",
        },

        READ_BATCH: {
          from: "Date",
          to: "Date",
          description: "Allows User to do something",
        },
        CREATE_BATCH: {
          from: "Date",
          to: "Date",
          description: "Allows User to do something",
        },
        UPDATE_BATCH: {
          from: "Date",
          to: "Date",
          description: "Allows User to do something",
        },
        DELETE_BATCH: {
          from: "Date",
          to: "Date",
          description: "Allows User to do something",
        },

        READ_PATTERN: {
          from: "Date",
          to: "Date",
          description: "Allows User to do something",
        },
        CREATE_PATTERN: {
          from: "Date",
          to: "Date",
          description: "Allows User to do something",
        },
        UPDATE_PATTERN: {
          from: "Date",
          to: "Date",
          description: "Allows User to do something",
        },
        DELETE_PATTERN: {
          from: "Date",
          to: "Date",
          description: "Allows User to do something",
        },
        READ_SUBJECT: {
          from: "Date",
          to: "Date",
          description: "Allows User to do something",
        },
        CREATE_SUBJECT: {
          from: "Date",
          to: "Date",
          description: "Allows User to do something",
        },
        UPDATE_SUBJECT: {
          from: "Date",
          to: "Date",
          description: "Allows User to do something",
        },
        DELETE_SUBJECT: {
          from: "Date",
          to: "Date",
          description: "Allows User to do something",
        },
        MANAGE_CHAPTER: {
          from: "Date",
          to: "Date",
          description: "Allows User to do something",
        },
        MANAGE_TOPIC: {
          from: "Date",
          to: "Date",
          description: "Allows User to do something",
        },
        READ_TEST: {
          from: "Date",
          to: "Date",
          description: "Allows User to do something",
        },
        READ_GLOBAL_TEST: {
          from: "Date",
          to: "Date",
          description: "Allows User to do something",
        },
        VIEW_RESULT: {
          from: "Date",
          to: "Date",
          description: "Allows User to do something",
        },
        PUBLISH_RESULT: {
          from: "Date",
          to: "Date",
          description: "Allows User to do something",
        },
        EXPORT_RESULT: {
          from: "Date",
          to: "Date",
          description: "Allows User to do something",
        },
        CREATE_TEST: {
          from: "Date",
          to: "Date",
          description: "Allows User to do something",
        },
        UPDATE_TEST: {
          from: "Date",
          to: "Date",
          description: "Allows User to do something",
        },
        DELETE_TEST: {
          from: "Date",
          to: "Date",
          description: "Allows User to do something",
        },
      },
    };
    setPermissionInformation(response);
  }

  useEffect(() => {
    getRoleInformation(roleName);
  }, [roleName]);

  useEffect(() => {
    if (rolePermissions && roleName) {
      let perms = rolePermissions[roleName];
      console.log(rolePermissions, perms);
      setAllowedPermissions(perms.map((_: any) => permissions.indexOf(_)));
    }
  }, [rolePermissions, roleName, permissions]);

  useEffect(() => {
    if (permissionInformation?.permission)
      setPermissions(Object.keys(permissionInformation.permission));
    console.log(permissionInformation);
  }, [permissionInformation]);

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

    // allowedPermisions
    //   .map((idx: number) => permissions[idx])
    //   .forEach((perm: any) => {
    //     newPerms = {
    //       ...newPerms,
    //       [perm]: {
    //         from: new Date().toISOString(),
    //         to: new Date(
    //           new Date().setDate(new Date().getDate() + 365)
    //         ).toISOString(),
    //       },
    //     };
    //   });

    const res = await axios.post("http://localhost:5000/roles/update", {
      id: roleName,
      permissions: newPerms,
    });

    console.log({ res });
  }

  return (
    <>
      {true || isReadPermitted ? (
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
                {permissions?.map((permission: string, index: number) => {
                  return (
                    <div key={index}>
                      <Permission
                        idx={index}
                        name={permission}
                        description={
                          permissionInformation.permission[permission]
                            .description
                        }
                        allowedPermissions={allowedPermisions}
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
                Manage People
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
  allowedPermissions: number[];
  handleChangePermission: (idx: number, checked: boolean) => void;
}

export const Permission = (props: PermissionProps) => {
  const { idx, name, description, allowedPermissions, handleChangePermission } =
    props;

  return (
    <div className={styles.permission}>
      <div className={styles.leftContent}>
        <h4>{name}</h4>

        <p>{description}</p>
      </div>
      <ToggleButton
        checked={allowedPermissions.includes(idx)}
        onChange={(checked) => handleChangePermission(idx, checked)}
      />
    </div>
  );
};

export default EditRole;
