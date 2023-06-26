import styles from "../Questions.module.scss";

import {
  TextField,
  FormControl,
  MenuItem,
  Select,
  InputLabel,
  Autocomplete,
  SelectChangeEvent,
  IconButton,
  Box,
} from "@mui/material";
import { styled } from "@mui/system";
import { message, Spin, Table } from "antd";
import { QUESTION_COLS_ALL } from "../../../utils/constants";
import { Modal, ToggleButton } from "../../../components";
import { useEffect, useState } from "react";
import { splitAndKeepDelimiters } from "../../../utils";
import "katex/dist/katex.min.css";
import katex from "katex";
import CustomTable from "../../../components/CustomTable/CustomTable";
import { API_QUESTIONS } from "../../../utils/api/config";
import RenderWithLatex from "../../../components/RenderWithLatex/RenderWithLatex";
import Delete from "@mui/icons-material/Delete";
import { DeleteOutline } from "@mui/icons-material";
import CustomPopConfirm from "../../../components/PopConfirm/CustomPopConfirm";
import { ConsoleSqlOutlined } from "@ant-design/icons";
import Tabs from "@mui/material/Tabs";

import Tab from "@mui/material/Tab";
import { TabContext, TabList, TabPanel } from "@mui/lab";
interface MUISelectProps {
  label: string;
  state: string;
  options: Array<{
    name: string;
  }>;
  error?: boolean;
  disabled?: boolean;
  onChange: React.Dispatch<React.SetStateAction<string>>;
}

export const MUISelect = (props: MUISelectProps) => {
  const handleChange = (event: SelectChangeEvent<string>) => {
    props.onChange(event.target.value);
  };
  return (
    <StyledFormControl sx={{ minWidth: 250 }} >
      <InputLabel
        htmlFor="component-outlined"
        variant="outlined"
        sx={props.error ? { color: "var(--clr-error)" } : {}}
        id="demo-simple-select-helper-label"
      >
        {props.label}
      </InputLabel>
      <Select
        labelId="demo-simple-select-helper-label"
        id="demo-simple-select-helper"
        value={props.state}
        label={props.label}
        onChange={handleChange}
        error={props.error}
        disabled={props.disabled}
      >
        {props.options.map((item, index) => (
          <MenuItem key={index} value={item.name}>
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
      transform: "translate(9px, -9px) scale(0.75)",
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
      transform: "translate(9px, -9px) scale(0.75)",
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
      backgroundColor: "transaprent",
    },
    ".MuiInputLabel-root.Mui-focused": {
      transform: "translate(9px, -9px) scale(0.75)",
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
  loading?: boolean;
  pagination?: any;
}

export const QuestionsTable: React.FC<QuestionsTableProps> = ({
  cols,
  dataSource,
  height,
  loading,
  pagination,
}) => {
  return (
    <CustomTable
      columns={cols || QUESTION_COLS_ALL}
      dataSource={dataSource}
      loading={loading}
      scroll={{
        y: height || "50vh",
        x: "100%",
      }}
      pagination={pagination}
      // expandable={{
      //   expandedRowRender: (record) => (
      //     <div
      //       style={{ margin: "0 auto", width: "70%" }}
      //       className={styles.flexRow}
      //     >
      //       {record?.en?.options?.map((option: any, i: number) => (
      //         <div key={i}>
      //           <span>{String.fromCharCode(64 + i + 1)})</span>
      //           <div dangerouslySetInnerHTML={{ __html: option.value }}></div>
      //         </div>
      //       ))}
      //     </div>
      //   ),
      // }}
    />
  );
};

interface PreviewHTMLModalProps {
  isOpen: boolean;
  handleClose: () => void;
  quillString: string;
  previewData: {
    isProofRead: boolean;
    id: string;
    type: string;
    en: {
      solution: string;
    };
  };
  setPreviewData: any;
  setQuestions: any;
  showFooter: boolean;
}
interface IToggleProofReadPayload {
  id: string;
  isProofRead: boolean;
  type: string;
}

export const PreviewHTMLModal: React.FC<PreviewHTMLModalProps> = ({
  isOpen,
  handleClose,
  quillString,
  previewData,
  setQuestions,
  setPreviewData,
  showFooter,
}) => {
  const [previewHTML, setPreviewHTML] = useState("");
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [tab, setTab] = useState("1");
  // console.log({ previewData });
  const handleToggleProofread = async (checked: any) => {
    console.log(checked);
    let obj = { ...previewData, isProofRead: checked };
    let payload: IToggleProofReadPayload = {
      id: previewData.id,
      isProofRead: checked,
      type: previewData.type,
    };
    try {
      const res = await API_QUESTIONS().patch(`/toggleproofread`, {
        data: payload,
      });
      if (res?.data?.status === "success") {
        console.log(res);
        setQuestions((currQues: any) => {
          let arr = currQues.map((el: any) => {
            return el.id !== previewData.id ? el : obj;
          });
          console.log(arr);
          return arr;
        });
        setPreviewData(obj);
      }
      console.log(previewData);
    } catch (err) {
      console.log(err);
    }
  };
  const handleDeleteQuestion = async () => {
    const type = previewData.type;
    let url;
    switch (type) {
      case "single":
      case "multiple":
        url = "/mcq/delete";
        break;
      case "integer":
        url = "/numerical/delete";
        break;
      default:
        console.log(type);
    }
    console.log({ url, type, previewData });
    if (url) {
      try {
        const res = await API_QUESTIONS().delete(url, {
          data: {
            id: previewData.id,
          },
        });
        console.log(res);
        handleClose();
        message.success("Deleted successfully!");
        setQuestions((currQues: any) => {
          let arr = currQues.filter((el: any) => {
            return el.id !== previewData.id;
          });
          console.log(arr);
          return arr;
        });
        console.log(previewData);
      } catch (err) {
        console.log(err);
      }
    }
  };
  const handleChangeTab = (event: React.SyntheticEvent, newValue: string) => {
    setTab(newValue);
  };
  return (
    <Modal
      isOpen={isOpen}
      title="Preview"
      onClose={handleClose}
      footer={
        showFooter ? (
          <div className={styles.footer}>
            <div className={styles.toggleButton}>
              Proof Read
              <ToggleButton
                checked={previewData.isProofRead}
                stopPropagation
                onChange={(checked: any) => handleToggleProofread(checked)}
              />
            </div>
            <CustomPopConfirm
              title="Are you sure?"
              okText="Delete"
              cancelText="No"
              onConfirm={handleDeleteQuestion}
            >
              <IconButton>
                <DeleteOutline />
              </IconButton>
            </CustomPopConfirm>
          </div>
        ) : null
      }
    >
      {isPreviewLoading ? (
        <div className={styles.loading}>
          <Spin />
        </div>
      ) : (
        <TabContext value={tab}>
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <TabList
              onChange={handleChangeTab}
              aria-label="lab API tabs example"
            >
              <Tab label="Question" value="1" />
              <Tab label="Solution" value="2" />
            </TabList>
          </Box>
          <TabPanel value="1">
            {" "}
            <RenderWithLatex quillString={quillString} />
          </TabPanel>
          <TabPanel value="2">
            <RenderWithLatex quillString={previewData?.en?.solution} />
          </TabPanel>
        </TabContext>
      )}
    </Modal>
  );
};
