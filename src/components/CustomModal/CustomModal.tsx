import React, { useEffect } from "react";
import Modal from "@mui/material/Modal";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import closeIcon from "../../assets/icons/close-circle.svg";

interface CustomModalProps {
  open: boolean;
  handleOpen?: () => void;
  handleClose?: () => void;
  children: React.ReactNode;
  title: string;
}

const wrapper = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  minWidth: "400px",
  minHeight: "150px",
  background: "#f9f9f9",
  display: "flex",
  alignItems: "center",
  flexDirection: "column",
  padding: "1rem",
  borderRadius: "10px",
};

const content = {
  display: "flex",
  alignItem: "center",
  justifyContent: "space-between",
  width: "100%",
  marginBottom: "1rem",
};

const CustomModal = (props: CustomModalProps) => {
  const { open, handleClose, children, title } = props;

  return (
    <div>
      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={wrapper}>
          <Box sx={content}>
            <Typography id="modal-modal-title" variant="body1">
              {title}
            </Typography>
            <Button
              sx={{ padding: 0, minWidth: "20px", borderRadius: "50%" }}
              onClick={handleClose}
            >
              <img
                src={closeIcon}
                style={{ width: "25px", cursor: "pointer" }}
                alt="close-modal"
              />
            </Button>
          </Box>
          {children}
        </Box>
      </Modal>
    </div>
  );
};

export default CustomModal;
