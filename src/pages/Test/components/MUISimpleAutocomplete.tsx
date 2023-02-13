import { Autocomplete, TextField } from "@mui/material";

interface MUIAutocompleteProps {
  label: string;
  value?: {
    name: string;
    value: string;
  };
  onChange: any;
  options: Array<{
    name: string;
    value: string;
  }>;
  disabled?: boolean;
}

const MUISimpleAutocomplete = (props: MUIAutocompleteProps) => {
  return (
    <Autocomplete
      disablePortal
      id="combo-box-demo"
      options={props.options}
      onChange={(_, value) => props.onChange(value)}
      value={props.value}
      disabled={props.disabled}
      getOptionLabel={(option) => option.name || ""}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder={"Search for" + props.label}
          label={props.label}
        />
      )}
      
    />
  );
};

export default MUISimpleAutocomplete;
