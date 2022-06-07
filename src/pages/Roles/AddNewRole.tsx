import { useContext, useState } from "react";
import { InputField, Modal, Button } from "../../components";
import styles from "./AddNewRole.module.scss";
import { APIS, PERMISSIONS } from "../../utils/constants";
import { Permission } from "./EditRole/EditRole";
import axios from "axios";
import { AuthContext } from "../../utils/auth/AuthContext";

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

  async function handleSubmit() {
    const res = await axios.post(`${APIS.USERS_API}/roles/create`, {
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
    console.log({ res });
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
        <div className={styles.permissions}>
          {flattendPermissions().map((permission: string, i: number) => (
            <Permission
              key={i}
              idx={i}
              description="This is description"
              name={permission}
              isChecked={selectedPermissions.includes(i)}
              handleChangePermission={(idx: number, checked: boolean) => {
                if (checked) {
                  setSelectedPermissions([...selectedPermissions, idx]);
                } else {
                  setSelectedPermissions(
                    selectedPermissions.filter((p: number) => p !== idx)
                  );
                }
              }}
            />
          ))}
        </div>
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
