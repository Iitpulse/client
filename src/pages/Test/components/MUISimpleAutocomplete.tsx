import { Autocomplete, TextField } from "@mui/material";

interface MUIAutocompleteProps {
  label: string;
  state?: string;
  onChange: any;
  options: Array<{
    name: string;
    value: string;
  }>;
}

const MUISimpleAutocomplete = (props: MUIAutocompleteProps) => {
  return (
    <Autocomplete
      disablePortal
      id="combo-box-demo"
      options={props.options}
      onChange={(_, value) => props.onChange(value?.value || "")}
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
