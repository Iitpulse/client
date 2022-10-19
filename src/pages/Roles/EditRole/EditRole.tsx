import { useContext, useEffect, useState } from "react";
import { useParams } from "react-router";
import { Tabs, Tab, IconButton } from "@mui/material";
import styles from "./EditRole.module.scss";
import {
  PermissionsContext,
  usePermission,
} from "../../../utils/contexts/PermissionsContext";
import { APIS, PERMISSIONS } from "../../../utils/constants";
import { Error } from "../../";
import {
  Sidebar,
  NotificationCard,
  ToggleButton,
  Button,
  Card,
} from "../../../components";
import clsx from "clsx";
import axios from "axios";
import { flattendPermissions } from "../AddNewRole";
import ClearIcon from "@mui/icons-material/Clear";
import { API_USERS } from "../../../utils/api";
import {
  CustomAccordion,
  CustomAccordionDetails,
  CustomAccordionSummary,
} from "../../Pattern/components/CustomAccordion";
import { message } from "antd";

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
  const [permissions, setPermissions] = useState<any>({});
  const [allowedPermissions, setAllowedPermissions] = useState<any>([]);
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
    setPermissions(PERMISSIONS);
  }, [roleName]);

  useEffect(() => {
    if (roleName && allRoles) {
      setMembers(
        allRoles.filter((role: any) => role.id === roleName)[0]?.members
      );
    }
  }, [allRoles, roleName]);

  useEffect(() => {
    if (rolePermissions && roleName) {
      let perms = rolePermissions[roleName];
      console.log({ perms });
      if (perms) {
        setAllowedPermissions(perms);
      }
    }
  }, [rolePermissions, roleName, permissions]);

  function handleChangePermission(
    permissionName: string | Array<string>,
    checked: boolean
  ) {
    console.log({ permissionName, checked });
    if (checked) {
      let newPermis = [];
      if (Array.isArray(permissionName)) {
        newPermis = [...allowedPermissions, ...permissionName];
      } else {
        newPermis = [...allowedPermissions, permissionName];
      }
      setAllowedPermissions(newPermis);
    } else {
      if (Array.isArray(permissionName)) {
        setAllowedPermissions(
          allowedPermissions.filter(
            (perm: any) => !permissionName.includes(perm)
          )
        );
      } else {
        setAllowedPermissions(
          allowedPermissions.filter((item: any) => item !== permissionName)
        );
      }
    }
  }

  async function handleClickUpdate() {
    const msgLoding = message.loading({
      content: "Updating Role...",
      key: "updateRole",
    });
    try {
      await API_USERS().post(`/roles/update`, {
        id: roleName,
        permissions: allowedPermissions,
      });
      msgLoding();
      message.success({
        content: "Role Updated Successfully",
        key: "updateRole",
      });
    } catch (error) {
      msgLoding();
      message.error({ content: "Error Updating Role", key: "updateRole" });
    }
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
            <Card classes={[styles.tabHeaders]}>
              <Tabs value={tab} onChange={handleChangeTab}>
                <Tab label="Permissions" />
                <Tab label="Manage People" />
              </Tabs>
            </Card>
            <TabPanel value={tab} index={0}>
              <div className={clsx(styles.tabPanel, styles.permissions)}>
                {Object.keys(permissions).map(
                  (permissionName: any, index: number) => {
                    return (
                      <Card key={index} classes={[styles.permissionsContainer]}>
                        <Permission
                          permissionName={permissionName}
                          idx={index}
                          permissions={Object.values(
                            permissions[permissionName]
                          )?.map((perm: any, idx: number) => ({
                            name: perm,
                            isChecked: allowedPermissions.includes(perm),
                          }))}
                          handleChangePermission={handleChangePermission}
                        />
                      </Card>
                    );
                  }
                )}
              </div>
            </TabPanel>
            <TabPanel value={tab} index={1}>
              
              <div className={clsx(styles.tabPanel, styles.managePeople)}>
                {members?.map((member: any,index:number) => (
                   <Card key={index} classes={[styles.peopleContainer]}>
                  <div className={styles.flexRow}>
                    <p>{member?.name}</p>
                    <IconButton>
                      <ClearIcon />
                    </IconButton>
                  </div>
                  </Card>
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
  permissionName: string;
  permissions: Array<{
    name: string;
    isChecked: boolean;
  }>;
  idx: number;
  handleChangePermission: (
    permissionName: string | Array<string>,
    checked: boolean
  ) => void;
}

export const Permission = (props: PermissionProps) => {
  const { idx, permissionName, permissions, handleChangePermission } = props;

  const [allPermissionsChecked, setAllPermissionsChecked] = useState(false);

  useEffect(() => {
    setAllPermissionsChecked(permissions.every((perm: any) => perm.isChecked));
    console.log(permissions.some((perm: any) => perm.isChecked));
  }, [permissions]);

  function handleChangeAllPermissions(checked: boolean) {
    setAllPermissionsChecked(checked);
    handleChangePermission(
      permissions?.map((item: any) => item.name),
      checked
    );
  }

  return (
    <CustomAccordion>
      <CustomAccordionSummary>
        <div className={styles.permissionHeader}>
          <p>{permissionName}</p>
          <ToggleButton
            checked={allPermissionsChecked}
            partial={
              permissions.some((perm: any) => perm.isChecked) &&
              !allPermissionsChecked
            }
            stopPropagation
            onChange={(checked) => handleChangeAllPermissions(checked)}
          />
        </div>
      </CustomAccordionSummary>
      <CustomAccordionDetails>
        <div className={styles.permissionWrapper}>
          {permissions.map((permission: any, i: number) => (
            <div className={styles.permission}>
              <div className={styles.leftContent}>
                <h4>
                  {permission?.name
                    ?.replace(/_/g, " ")
                    .replace(permissionName, "")}
                </h4>

                {/* <p>{description}</p> */}
              </div>
              <ToggleButton
                checked={permission?.isChecked}
                onChange={(checked) =>
                  handleChangePermission(permission?.name, checked)
                }
              />
            </div>
          ))}
        </div>
      </CustomAccordionDetails>
    </CustomAccordion>
  );
};

export default EditRole;
