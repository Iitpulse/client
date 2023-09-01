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
      style={{
        top: 10,
        minHeight: "100vh",
      }}
    >
      <AppBar sx={{ position: "relative" }}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={handleClose}
            aria-label="close"
          >
            <CloseIcon />
          </IconButton>
          <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
            {title}
          </Typography>
          <Button autoFocus color="inherit" onClick={onClickActionBtn}>
            {actionBtnText}
          </Button>
        </Toolbar>
      </AppBar>
      {children}
    </Modal>
  );
};

export default CustomDialog;
