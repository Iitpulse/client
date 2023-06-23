import * as React from "react";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Autocomplete, { createFilterOptions } from "@mui/material/Autocomplete";
import { FormHelperText, Tooltip } from "@mui/material";

const filter = createFilterOptions<IOptionType>();

interface ICreatableSelect {
  options: any;
  onAddModalSubmit: (value: any) => void;
  value: IOptionType | IOptionType[];
  setValue: any;
  label: string;
  id: string;
  multiple?: boolean;
  width?: string;
  disabled?: boolean;
  chapters?: Array<any>;
  error?: boolean;
  children?: any;
  setChapters?: any;
  setTopics?: any;
  [x: string]: any;
  enabledToolTipTitle?: string;
  disabledToolTipTitle?: string;
  enableToolTip?: boolean;
  errorText?: string;
}

interface IOptionType {
  name: string;
  inputValue?: string;
  value?: string | number;
}

const listToNotAddValuesIn = ["chapters", "topics", "subject"];

const CreatableSelect: React.FC<ICreatableSelect> = ({
  multiple = false,
  options = [],
  value,
  setValue,
  label,
  id,
  width,
  disabled,
  chapters,
  error,
  onAddModalSubmit,
  children,
  setChapters,
  setTopics,
  enabledToolTipTitle,
  disabledToolTipTitle,
  enableToolTip,
  errorText,
  ...remaining
}) => {
  const [open, toggleOpen] = React.useState(false);
  const [chapter, setChapter] = React.useState<IOptionType>();

  const handleClose = () => {
    setDialogValue("");
    toggleOpen(false);
  };

  const [dialogValue, setDialogValue] = React.useState<string>("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Pass the actual value later
    onAddModalSubmit(
      chapters?.length
        ? {
            chapter: chapter?.name,
            topic: dialogValue,
          }
        : dialogValue
    );
    if (multiple) {
      setValue((prev: any) =>
        listToNotAddValuesIn.includes(id.toLowerCase())
          ? [...prev]
          : [...prev, dialogValue]
      );
    } else {
      setValue(
        listToNotAddValuesIn.includes(id.toLowerCase()) ? "" : dialogValue
      );
    }
    handleClose();
  };

  React.useEffect(() => {
    // console.log(value);
  }, [value]);

  return (
    <React.Fragment>
      <Tooltip
        disableHoverListener={
          !enableToolTip || (value as Array<IOptionType>)?.length > 0
        }
        disableFocusListener={
          !enableToolTip || (value as Array<IOptionType>)?.length > 0
        }
        title={!disabled ? enabledToolTipTitle : disabledToolTipTitle}
      >
        <>
          <Autocomplete
            multiple={multiple}
            value={value}
            isOptionEqualToValue={(option: IOptionType, value: IOptionType) =>
              option?.name === value?.name
            }
            disabled={disabled || false}
            onChange={
              multiple
                ? (event, newValue: any) => {
                    if (typeof newValue === "string") {
                      // timeout to avoid instant validation of the dialog's form.
                      setTimeout(() => {
                        toggleOpen(true);
                        setDialogValue(newValue);
                      });
                      if (id === "subject") {
                        setChapters([]);
                        setTopics([]);
                      }
                    } else if (
                      newValue &&
                      multiple &&
                      newValue[newValue?.length - 1]?.inputValue
                    ) {
                      toggleOpen(true);
                      setDialogValue(newValue[newValue?.length - 1].inputValue);
                      if (id === "subject") {
                        setChapters([]);
                        setTopics([]);
                      }
                    } else {
                      setValue(newValue);
                      if (id === "subject") {
                        setChapters([]);
                        setTopics([]);
                      }
                    }
                  }
                : (event, newValue: any) => {
                    if (typeof newValue === "string") {
                      // timeout to avoid instant validation of the dialog's form.
                      setTimeout(() => {
                        toggleOpen(true);
                        setDialogValue(newValue);
                        if (id === "subject") {
                          setChapters([]);
                          setTopics([]);
                        }
                      });
                    } else if (newValue && newValue.inputValue) {
                      toggleOpen(true);
                      setDialogValue(newValue.inputValue);
                      if (id === "subject") {
                        setChapters([]);
                        setTopics([]);
                      }
                    } else {
                      setValue(newValue);
                      if (id === "subject") {
                        setChapters([]);
                        setTopics([]);
                      }
                    }
                  }
            }
            filterOptions={(options, params) => {
              const filtered = filter(options, params);

              if (params?.inputValue !== "") {
                filtered.push({
                  inputValue: params.inputValue,
                  name: `Add "${params.inputValue}"`,
                });
              }

              return filtered;
            }}
            id={id}
            options={options}
            getOptionLabel={(option) => {
              // e.g value selected with enter, right from the input
              if (typeof option === "string") {
                return option;
              }
              if (option?.inputValue) {
                return option.inputValue;
              }
              return option?.name;
            }}
            selectOnFocus
            clearOnBlur
            handleHomeEndKeys
            filterSelectedOptions
            renderOption={(props, option) => <li {...props}>{option?.name}</li>}
            sx={{ width: width || 300 }}
            renderInput={(params) => (
              <TextField error={error} {...params} label={label} />
            )}
            {...remaining}
          />
          {error && (
            <span
              style={{
                color: "red",
                opacity: 0.6,
                fontSize: "0.75rem",
                display: "block",
              }}
            >
              {errorText}
            </span>
          )}
        </>
      </Tooltip>
      <Dialog open={open} onClose={handleClose}>
        <form style={{ minWidth: "300px" }} onSubmit={handleSubmit}>
          <DialogTitle sx={{ paddingBottom: "0" }}>
            Add a new {label?.replace("(s)", "")} "{dialogValue}"
          </DialogTitle>
          <DialogContent sx={{ padding: "0 1rem" }}>
            {/* <DialogContentText>
              Did you miss any film in our list? Please, add it!
            </DialogContentText> */}
            {/* <TextField
              autoFocus
              margin="dense"
              id="name"
              value={dialogValue}
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
            {/* <TextField
              margin="dense"
              id="value"
              value={dialogValue.value}
              onChange={(event) =>
                setDialogValue({
                  ...dialogValue,
                  value: event.target.value,
                })
              }
              label="Value"
              type="text"
              variant="standard"
            /> */}
            {chapters?.length && (
              <div style={{ marginTop: "1rem", width: "100%" }}>
                <Autocomplete
                  value={chapter}
                  isOptionEqualToValue={(
                    option: IOptionType,
                    value: IOptionType
                  ) => option.name === value.name}
                  disabled={disabled || false}
                  onChange={(event, newValue: any) => {
                    setChapter(newValue);
                  }}
                  filterOptions={(options, params) => {
                    const filtered = filter(options, params);
                    return filtered;
                  }}
                  id={id}
                  options={chapters}
                  getOptionLabel={(option) => {
                    // e.g value selected with enter, right from the input
                    // console.log({ option });
                    if (typeof option === "string") {
                      return option;
                    }
                    if (option.inputValue) {
                      return option.inputValue;
                    }
                    return option.name;
                  }}
                  selectOnFocus
                  clearOnBlur
                  handleHomeEndKeys
                  filterSelectedOptions
                  renderOption={(props, option) => (
                    <li {...props}>{option.name}</li>
                  )}
                  sx={{ width: width || "100%" }}
                  renderInput={(params) => (
                    <TextField {...params} label={"Chapter"} />
                  )}
                />
              </div>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="submit">Add</Button>
          </DialogActions>
        </form>
      </Dialog>
    </React.Fragment>
  );
};

export default CreatableSelect;
