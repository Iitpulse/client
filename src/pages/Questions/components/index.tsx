import styles from "../Questions.module.scss";

import {
  TextField,
  FormControl,
  MenuItem,
  Select,
  InputLabel,
  Autocomplete,
  SelectChangeEvent,
} from "@mui/material";
import { styled } from "@mui/system";
import { Table } from "antd";
import { QUESTION_COLS_ALL } from "../../../utils/constants";

interface MUISelectProps {
  label: string;
  state: string;
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
        value={props.state}
        label="Age"
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
  state?: string;
  onChange: any;
  options: Array<{
    name: string;
    value: string;
  }>;
  disabled?: boolean;
}

export const MUIChipsAutocomplete = (props: MUIAutocompleteProps) => {
  return (
    <Autocomplete
      multiple
      id="tags-outlined"
      onChange={(_, value) =>
        props.onChange(
          value.map((item) => {
            return item.value;
          })
        )
      }
      disabled={props.disabled}
      options={props.options}
      getOptionLabel={(option) => option.name}
      filterSelectedOptions
      renderInput={(params) => (
        <TextField
          {...params}
          label={props.label}
          placeholder={"Search for " + props.label}
        />
      )}
    />
  );
};

export const MUISimpleAutocomplete = (props: MUIAutocompleteProps) => {
  return (
    <Autocomplete
      className={styles.something}
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

const StyledMUITextField = styled(TextField)(() => {
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

const StyledFormControl = styled(FormControl)(() => {
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

const rowSelection = {
  onChange: (selectedRowKeys: any, selectedRows: any) => {
    console.log(
      `selectedRowKeys: ${selectedRowKeys}`,
      "selectedRows: ",
      selectedRows
    );
  },
  onSelect: (record: any, selected: any, selectedRows: any) => {
    console.log(record, selected, selectedRows);
  },
  onSelectAll: (selected: any, selectedRows: any, changeRows: any) => {
    console.log(selected, selectedRows, changeRows);
  },
};

interface QuestionsTableProps {
  cols?: Array<any>;
  dataSource: Array<any>;
  height?: string;
}

export const QuestionsTable: React.FC<QuestionsTableProps> = ({
  cols,
  dataSource,
  height,
}) => {
  return (
    <Table
      columns={cols || QUESTION_COLS_ALL}
      dataSource={dataSource}
      rowSelection={{ ...rowSelection }}
      scroll={{
        y: height || "50vh",
        x: "100%",
      }}
      expandable={{
        expandedRowRender: (record) => (
          <div
            style={{ margin: "0 auto", width: "70%" }}
            className={styles.flexRow}
          >
            {record?.en?.options?.map((option: any, i: number) => (
              <div key={i}>
                <span>{String.fromCharCode(64 + i + 1)})</span>
                <div dangerouslySetInnerHTML={{ __html: option.value }}></div>
              </div>
            ))}
          </div>
        ),
      }}
    />
  );
};
