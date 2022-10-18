import { useContext, useState } from "react";
import { InputField, Modal, Button } from "../../components";
import styles from "./AddNewRole.module.scss";
import { APIS, PERMISSIONS } from "../../utils/constants";
import { Permission } from "./EditRole/EditRole";
import axios from "axios";
import { AuthContext } from "../../utils/auth/AuthContext";
import { API_USERS } from "../../utils/api";
import { message } from "antd";
import { useNavigate } from "react-router";

export const flattendPermissions = () => {
  let final: any = [];
  Object.keys(PERMISSIONS).forEach((item) => {
    // @ts-ignores
    final = [...final, ...Object.values(PERMISSIONS[item])];
  });
  return final;
};

const AddNewRole: React.FC<{
  open: boolean;
  handleClose: () => void;
}> = ({ open, handleClose }) => {
  const [name, setName] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<any>([]);

  const { currentUser } = useContext(AuthContext);

  const navigate = useNavigate();

  async function handleSubmit() {
    const loading = message.loading(`Creating ${name} role for you...`, 0);
    try {
      const newRoleRes = await API_USERS().post(`/roles/create`, {
        name,
        permissions: flattendPermissions().filter((_: any, i: number) =>
          selectedPermissions.includes(i)
        ),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: {
          id: currentUser?.id,
          userType: currentUser?.userType,
        },
      });
      loading();
      message.success(`Role ${name} created successfully`);
      handleClose();
      navigate(`/roles/${newRoleRes.data.id || newRoleRes.data._id}`);
    } catch (error) {
      loading();
      message.error(`Error creating role ${name}`);
      console.log(error);
    }
  }

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title="Create New Role"
      footer={<AddNewRoleFooter handleSubmit={handleSubmit} />}
      backdrop
    >
      <div className={styles.container}>
        <InputField
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          label="Name"
        />
        {/* <div className={styles.permissions}>
          {Object.keys(PERMISSIONS).map(
            (permissionName: any, index: number) => {
              return (
                <div key={index}>
                  <Permission
                    permissionName={permissionName}
                    idx={index}
                    permissions={Object.values(
                      // @ts-ignore
                      PERMISSIONS[permissionName]
                    )?.map((perm: any, idx: number) => ({
                      name: perm,
                      isChecked: selectedPermissions.includes(perm),
                    }))}
                    handleChangePermission={(
                      permissionName: string | Array<string>,
                      checked: boolean
                    ) => {
                      if (checked) {
                        let newPerms = [];
                        if (Array.isArray(permissionName)) {
                          newPerms = [
                            ...selectedPermissions,
                            ...permissionName,
                          ];
                        } else {
                          newPerms = [...selectedPermissions, permissionName];
                        }
                        setSelectedPermissions(newPerms);
                      } else {
                        if (Array.isArray(permissionName)) {
                          selectedPermissions.filter(
                            (p: string) => !permissionName.includes(p)
                          );
                        } else {
                          selectedPermissions.filter(
                            (p: string) => p !== permissionName
                          );
                        }
                      }
                    }}
                  />
                  {<div className={styles.separationLine}></div>}
                </div>
              );
            }
          )}
        </div> */}
      </div>
    </Modal>
  );
};

export default AddNewRole;

const AddNewRoleFooter: React.FC<{ handleSubmit: () => void }> = ({
  handleSubmit,
}) => {
  return <Button onClick={handleSubmit}>Submit</Button>;
};
