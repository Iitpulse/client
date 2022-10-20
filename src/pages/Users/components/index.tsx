import {
  TextField,
  Dialog,
  DialogActions,
  DialogTitle,
  DialogContent,
  DialogContentText,
  Button,
  Autocomplete,
  FormHelperText,
} from "@mui/material";
import { createFilterOptions } from "@mui/material/Autocomplete";
import styles from "./index.module.scss";
import { styled } from "@mui/system";
import { useEffect, useState } from "react";

export const StyledMUITextField = styled(TextField)(() => {
  return {
    input: {
      fontSize: "1rem",
      padding: "1.2rem 1.3rem",
    },
    label: {
      fontSize: "1rem",
      maxWidth: "none",
      padding: "0rem 0.5rem",
      backgroundColor: "transparent",
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
  handleCloseModal: () => void;
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

// ----------------------------------------------------------------------------

interface DropdownOptionType {
  name: string;
  inputValue?: any;
  value: any;
}
const filter = createFilterOptions<DropdownOptionType>();

interface MUICreatableSelectProps {
  options: Array<DropdownOptionType>;
  label: string;
  id: string;
  value: any;
  onChange: any;
  error?: boolean;
  helperText?: string;
}

export const MUICreatableSelect: React.FC<MUICreatableSelectProps> = ({
  options,
  label,
  id,
  onChange,
  value,
  error = false,
  helperText = "",
}) => {
  // const [value, setValue] = useState<DropdownOptionType | null>(null);
  const [open, toggleOpen] = useState(false);
  const handleClose = () => {
    setDialogValue({
      name: "",
      inputValue: "",
    });
    toggleOpen(false);
  };

  const [dialogValue, setDialogValue] = useState({
    name: "",
    inputValue: "",
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // setValue({
    //   name: dialogValue.name,
    //   value: parseInt(dialogValue.inputValue, 10),
    // });
    onChange(event, {
      name: dialogValue.name,
      value: parseInt(dialogValue.inputValue, 10),
    });
    handleClose();
  };
  return (
    <div className={styles.creatableSelect}>
      <StyledMUIAutocompleteForCreatableSelect
        id={id}
        value={value ? value.name : ""}
        onChange={(event, newValue: any) => {
          console.log({ newValue });
          if (newValue && newValue.inputValue) {
            toggleOpen(true);
            setDialogValue({
              name: newValue.value,
              inputValue: "",
            });
          } else {
            // setValue(newValue);
            onChange(event, newValue);
          }
        }}
        filterOptions={(options: any, params) => {
          const filtered = filter(options, params);
          if (params.inputValue !== "") {
            filtered.push({
              inputValue: params.inputValue,
              name: `Add "${params.inputValue}"`,
              value: params.inputValue,
            });
          }

          return filtered;
        }}
        options={options}
        getOptionLabel={(option: any) => {
          // e.g value selected with enter, right from the input
          if (typeof option === "string") {
            return option;
          }
          if (option.value) {
            return option.value;
          }
          return option.name;
        }}
        selectOnFocus
        clearOnBlur
        handleHomeEndKeys
        renderOption={(props, option: any) => <li {...props}>{option.name}</li>}
        sx={{ width: 300 }}
        freeSolo
        renderInput={(params) => (
          <TextField
            error={error}
            helperText={error && helperText}
            {...params}
            label={label}
          />
        )}
      />
      <Dialog open={open} onClose={handleClose}>
        <form onSubmit={handleSubmit}>
          <DialogTitle>Add a New "{label}"</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Did you miss any "{label}" in our list? Please, add it!
            </DialogContentText>
            <TextField
              autoFocus
              margin="dense"
              id="name"
              value={dialogValue.name}
              onChange={(event) =>
                setDialogValue({
                  ...dialogValue,
                  name: event.target.value,
                })
              }
              label="Name"
              type="text"
              variant="standard"
            />
            <TextField
              margin="dense"
              id="name"
              value={dialogValue.inputValue}
              onChange={(event) =>
                setDialogValue({
                  ...dialogValue,
                  inputValue: event.target.value,
                })
              }
              label="Value"
              type="text"
              variant="standard"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button>Add</Button>
          </DialogActions>
        </form>
      </Dialog>
    </div>
  );
};

export const StyledMUIAutocompleteForCreatableSelect = styled(Autocomplete)(
  () => {
    return {
      "& .MuiAutocomplete-endAdornment": {
        top: 0,
      },
    };
  }
);
