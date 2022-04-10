import { useState } from "react";
import { InputField, Modal, Button } from "../../components";
import styles from "./AddNewRole.module.scss";
import { PERMISSIONS } from "../../utils/constants";
import { Permission } from "./EditRole/EditRole";

const flattendPermissions = () => {
  let final: any = [];
  console.log({ per: Object.keys(PERMISSIONS) });
  Object.keys(PERMISSIONS).forEach((item) => {
    // @ts-ignores
    final = [...final, ...Object.values(PERMISSIONS[item])];
  });
  console.log({ final });
  return final;
};

const AddNewRole: React.FC<{
  open: boolean;
  handleClose: () => void;
}> = ({ open, handleClose }) => {
  const [name, setName] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<any>([]);

  async function handleSubmit() {}

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
              allowedPermissions={selectedPermissions}
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
