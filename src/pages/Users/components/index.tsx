import { TextField } from "@mui/material";
import { styled } from "@mui/system";

export const StyledMUITextField = styled(TextField)(() => {
  return {
    minWidth: "250px",
    input: {
      fontSize: "1rem",
      padding: "1.2rem 1.3rem",
    },
    label: {
      fontSize: "1rem",
      maxWidth: "none",
      padding: "0rem 0.5rem",
      backgroundColor: " #f3f3f9",
    },
    ".MuiInputLabel-root.Mui-focused": {
      transform: "translate(12px, -9px) scale(0.75)",
    },
    ".MuiFormLabel-filled": {
      transform: "translate(12px, -9px) scale(0.75)",
    },
  };
});

export interface UserProps {
  setIsModalRequested: React.Dispatch<React.SetStateAction<boolean>>;
  onSubmit: (e: any) => void;
  name: string;
  setName: React.Dispatch<React.SetStateAction<string>>;
  email: string;
  setEmail: React.Dispatch<React.SetStateAction<string>>;
  preparingFor?: string;
  setPreparingFor?: React.Dispatch<React.SetStateAction<string>>;
  adhaarNumber: string;
  setAdhaarNumber: React.Dispatch<React.SetStateAction<string>>;
  permanentAddress: string;
  setPermanentAddress: React.Dispatch<React.SetStateAction<string>>;
  currentAddress: string;
  setCurrentAddress: React.Dispatch<React.SetStateAction<string>>;
  personalContact: string;
  setPersonalContact: React.Dispatch<React.SetStateAction<string>>;
  emergencyContact: string;
  setEmergencyContact: React.Dispatch<React.SetStateAction<string>>;
  uploadedBy: string;
  id: string;
  handleReset: () => void;
}
