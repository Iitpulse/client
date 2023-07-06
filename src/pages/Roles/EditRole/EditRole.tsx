import { useCallback, useContext, useEffect, useState } from "react";
import { useParams } from "react-router";
import { Tabs, Tab, IconButton } from "@mui/material";
import { CustomTable } from "../../../components";
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
  Card,
} from "../../../components";
import clsx from "clsx";
import {
  CustomAccordion,
  CustomAccordionDetails,
  CustomAccordionSummary,
} from "../../Pattern/components/CustomAccordion";
import { message, Popconfirm } from "antd";
import MainLayout from "../../../layouts/MainLayout";
import deleteIcon from "../../../assets/icons/delete.svg";
import { EDIT_ROLE_TABLE_COLS } from "../utils";
import { AuthContext } from "../../../utils/auth/AuthContext";

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
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [targetUser, setTargetUser] = useState<any>({ name: "", id: "" });

  const {
    permissions: rolePermissions,
    allRoles,
    updateRole,
    removeMember,
  } = useContext(PermissionsContext);
  console.log("all roles :", allRoles);

  const authCtx = useContext(AuthContext);
  console.log(authCtx);
  function handleChangeTab(event: React.ChangeEvent<{}>, newValue: number) {
    setTab(newValue);
  }

  useEffect(() => {
    let obj = {};
    allRoles.map((role: any) => {
      obj = {
        ...obj,
        ["CREATE_" + role?.id?.slice(5)]: "CREATE_" + role?.id?.slice(5),
        ["READ_" + role?.id?.slice(5)]: "READ_" + role?.id?.slice(5),
        ["UPDATE_" + role?.id?.slice(5)]: "UPDATE_" + role?.id?.slice(5),
        ["DELETE_" + role?.id?.slice(5)]: "DELETE_" + role?.id?.slice(5),
      };
    });
    setPermissions({
      ...PERMISSIONS,
      USER: {
        ...PERMISSIONS.USER,
        ...obj,
      },
    });
  }, [roleName, allRoles]);
  console.log({ permissions });
  useEffect(() => {
    console.log({ roleName, allRoles });
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

  const handleClickUpdate = useCallback(async () => {
    const msgLoding = message.loading({
      content: "Updating Role...",
      key: "updateRole",
    });
    if (!roleName) return message.error("Role name is required");
    try {
      await updateRole(String(roleName), allowedPermissions);
      console.log({ roleName });
      if (authCtx.roles[String(roleName)]) {
        authCtx.setRoles({
          ...authCtx.roles,
          [String(roleName)]: {
            ...authCtx.roles[String(roleName)],
            permissions: allowedPermissions,
          },
        });
      }
      msgLoding();
      message.success({
        content: "Role Updated Successfully",
        key: "updateRole",
      });
    } catch (error) {
      msgLoding();
      message.error({ content: "Error Updating Role", key: "updateRole" });
    }
  }, [roleName, allowedPermissions, updateRole]);

  const handleClickRemoveUser = useCallback(
    async (member: Object, role: any) => {
      const msgLoding = message.loading({
        content: "Removing User...",
        key: "removeUser",
      });
      try {
        await removeMember(role, member);
        msgLoding();
        message.success({
          content: "User Removed Successfully",
          key: "removeUser",
        });
      } catch (error) {
        msgLoding();
        message.error({ content: "Error Removing User", key: "removeUser" });
      }
    },
    [removeMember]
  );

  return (
    <MainLayout name="Edit Role">
      {isReadPermitted ? (
        <>
          <div className={styles.editRole}>
            <Button
              onClick={handleClickUpdate}
              classes={[styles.floatingUpdateBtn]}
            >
              Update
            </Button>
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
                <CustomTable
                  columns={EDIT_ROLE_TABLE_COLS?.map((col: any) =>
                    col.key === "action"
                      ? ({
                          ...col,
                          render: (text: any, record: any) => (
                            <Popconfirm
                              title="Are you sure?"
                              onConfirm={() =>
                                handleClickRemoveUser(record, roleName)
                              }
                            >
                              <IconButton>
                                <img src={deleteIcon} alt="delete" />
                              </IconButton>
                            </Popconfirm>
                          ),
                        } as any)
                      : col
                  )}
                  dataSource={members}
                  scroll={{
                    x: 500,
                    y: 400,
                  }}
                />
              </div>
            </TabPanel>
          </div>
          {/* <Sidebar title="Recent Activity">
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
          </Sidebar> */}
        </>
      ) : (
        <Error />
      )}
    </MainLayout>
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
