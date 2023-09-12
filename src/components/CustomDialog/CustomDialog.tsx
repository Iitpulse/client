import { forwardRef } from "react";
import {
  Button,
  Dialog,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Slide,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { TransitionProps } from "@mui/material/transitions";
import { Modal } from "antd";


const Transition = forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement;
  },
  ref: React.Ref<unknown>
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

interface Props {
  open: boolean;
  handleClose: () => void;
  children: React.ReactNode;
  title: String;
  actionBtnText: String;
  onClickActionBtn: () => void;
}

const CustomDialog: React.FC<Props> = ({
  open,
  handleClose,
  children,
  title,
  actionBtnText,
  onClickActionBtn,
}) => {
  return (
    <Modal
      open={open}
      onCancel={handleClose}
      width={"100%"}

      onOk={onClickActionBtn}
      title={title}
      centered
      style={{
        top: 5,
        maxHeight: "100vh",

      }}
    >
      {children}
    </Modal>
  );
};

export default CustomDialog;
