import { useContext } from "react";
import { PermissionContext } from "../../utils/contexts/PermissionContext";

const Roles = () => {
  const { permission } = useContext(PermissionContext);
  console.log(permission);
  return <div>Roles</div>;
};

export default Roles;
