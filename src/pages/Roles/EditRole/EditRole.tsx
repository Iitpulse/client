import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { Tabs, Tab } from "@mui/material";
import styles from "./EditRole.module.scss";
import { usePermission } from "../../../utils/contexts/PermissionsContext";
import { PERMISSIONS } from "../../../utils/constants";
import { Error } from "../../";
import { Sidebar, NotificationCard, ToggleButton } from "../../../components";
import clsx from "clsx";

const EditRole = () => {
  const { roleName } = useParams();
  const [tab, setTab] = useState(0);
  const [permissionInformation, setPermissionInformation] = useState<any>({});
  const [permissions, setPermissions] = useState<any>([]);
  const isReadPermitted = usePermission(PERMISSIONS?.ROLE?.READ);
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
    if (permissionInformation?.permission)
      setPermissions(Object.keys(permissionInformation.permission));
    console.log(permissionInformation);
  }, [permissionInformation]);
  return (
    <>
      {isReadPermitted ? (
        <>
          <div className={styles.editRole}>
            {roleName}
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
                        name={permission}
                        description={
                          permissionInformation.permission[permission]
                            .description
                        }
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
  name: string;
  description: string;
}

const Permission = (props: PermissionProps) => {
  return (
    <div className={styles.permission}>
      <div className={styles.leftContent}>
        <h4>{props.name}</h4>

        <p>{props.description}</p>
      </div>
      <ToggleButton />
    </div>
  );
};

export default EditRole;
