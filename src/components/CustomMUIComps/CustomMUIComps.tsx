import {
  TextField,
  FormControl,
  MenuItem,
  Select,
  InputLabel,
  Chip,
  Autocomplete,
  SelectChangeEvent,
  FormHelperText,
} from "@mui/material";
import { styled } from "@mui/system";
import { useEffect } from "react";
import styles from "./CustomMUIComps.module.scss";

interface MUISelectProps {
  label: string;
  value: string;
  options: Array<{
    name: string;
    value: string;
  }>;
  onChange: React.Dispatch<React.SetStateAction<string>>;
}

export const MUISelect = (props: MUISelectProps) => {
  const handleChange = (event: SelectChangeEvent<string>) => {
    props.onChange(event.target.value);
  };
  return (
    <StyledFormControl sx={{ minWidth: 250 }}>
      <InputLabel id="demo-simple-select-helper-label">
        {props.label}
      </InputLabel>
      <Select
        labelId="demo-simple-select-helper-label"
        id="demo-simple-select-helper"
        value={props.value}
        label={props.label}
        onChange={handleChange}
      >
        {props.options.map((item, index) => (
          <MenuItem key={index} value={item.value}>
            {item.name}
          </MenuItem>
        ))}
      </Select>
    </StyledFormControl>
  );
};

interface MUIAutocompleteProps {
  label: string;
  value?: any;
  onChange: any;
  error?: boolean;
  helperText?: any;
  options: Array<{
    name: string;
    value: string;
  }>;
}

export const MUIChipsAutocomplete: React.FC<MUIAutocompleteProps> = ({
  options,
  label,
  value,
  onChange,
  error = false,
  helperText = "",
  ...rest
}) => {
  return (
    <Autocomplete
      multiple
      id="tags-outlined"
      onChange={(_, value) => {
        console.log("change", value);
        onChange(value);
      }}
      value={value}
      options={options}
      getOptionDisabled={(option) =>
        value.map((item: any) => item.name).includes(option.name)
      }
      getOptionLabel={(option) => option.name}
      renderInput={(params) => (
        <TextField
          {...params}
          error={error}
          helperText={error && helperText}
          label={label}
          placeholder={"Search for " + label}
        />
      )}
    />
  );
};

export const MUISimpleAutocomplete = (props: MUIAutocompleteProps) => {
  useEffect(() => {
    props.onChange(props.value || ""); // Update the value when props.value changes
    console.log("This is the value", props.value);
  }, [props.value]);
  return (
    <Autocomplete
      className={styles.something}
      options={props.options}
      onChange={(_, value) => props.onChange(value?.value || "")}
      getOptionLabel={(option) => option.name || ""}
      renderInput={(params) => (
        <TextField
          {...params}
          {...props}
          helperText={props?.error && props?.helperText}
          placeholder={"Search for" + props.label}
          label={props.label}
        />
      )}
    />
  );
};

export const StyledMUISelect = styled(MUISelect)(() => {
  return {
    minWidth: "250px",
    input: {
      fontSize: "1rem",
      padding: "1.2rem 1.3rem",
    },

    ".MuiInputLabel-root.Mui-focused": {
      transform: "translate(12px, -9px) scale(0.75)",
    },
    ".MuiFormLabel-filled": {
      transform: "translate(12px, -9px) scale(0.75)",
    },
  };
});

export const StyledFormControl = styled(FormControl)(() => {
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
      backgroundColor: "white",
    },
    ".MuiInputLabel-root.Mui-focused": {
      transform: "translate(12px, -9px) scale(0.75)",
    },
    ".MuiFormLabel-filled": {
      transform: "translate(12px, -9px) scale(0.75)",
    },
  };
});
