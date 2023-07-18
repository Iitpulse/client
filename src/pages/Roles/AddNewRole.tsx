import { useCallback, useContext, useRef, useState } from "react";
import { InputField, Modal, Sidebar } from "../../components";
import styles from "./AddNewRole.module.scss";
import { APIS, PERMISSIONS } from "../../utils/constants";
import { Permission } from "./EditRole/EditRole";
import axios from "axios";
import { AuthContext } from "../../utils/auth/AuthContext";
import { API_USERS } from "../../utils/api/config";
import { useNavigate } from "react-router";
import { PermissionsContext } from "../../utils/contexts/PermissionsContext";
import MainLayout from "../../layouts/MainLayout";
import {
  Button,
  Col,
  DatePicker,
  Divider,
  Drawer,
  Form,
  Input,
  Row,
  Select,
  Space,
  message,
} from "antd";

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
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { createNewRole } = useContext(PermissionsContext);

  const navigate = useNavigate();

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!name) {
        message.error("Role name is required");
        inputRef.current?.focus();
        return;
      }
      const loading = message.loading(`Creating ${name} role for you...`, 0);
      try {
        const newRole = await createNewRole(name);
        loading();
        message.success(`Role ${name} created successfully`);
        handleClose();
        setTimeout(() => {
          navigate(`/roles/${newRole.id || newRole._id}`);
        }, 1000);
      } catch (error) {
        loading();
        message.error(`Error creating role ${name}`);
        console.log(error);
      }
    },
    [name, createNewRole, handleClose, navigate]
  );

  return (
    <Sidebar
      title="Create New Role"
      open={open}
      width="30%"
      handleClose={handleClose}
      extra={
        <Button
          onClick={() => {
            if (formRef.current)
              formRef.current?.dispatchEvent(
                new Event("submit", { cancelable: true, bubbles: true })
              );
          }}
          type="primary"
          >
          Submit
        </Button>
      }
    >
      <form className={styles.container} ref={formRef} onSubmit={handleSubmit}>
        <Input
          required
          size="large"
          // value={name}
          onChange={(e)=>{setName(e.target.value)}}
          placeholder="Role Name"
          // variant="outlined"
        />
      </form>
    </Sidebar>
  );
};

export default AddNewRole;