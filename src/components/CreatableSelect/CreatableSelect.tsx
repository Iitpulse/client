import * as React from "react";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Autocomplete, { createFilterOptions } from "@mui/material/Autocomplete";
import { FormHelperText } from "@mui/material";

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
  children?: any;
}

interface IOptionType {
  name: string;
  inputValue?: string;
  value?: string | number;
}

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
  onAddModalSubmit,
  children,
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
      setValue((prev: any) => [...prev, dialogValue]);
    } else {
      setValue(dialogValue);
    }
    handleClose();
  };

  React.useEffect(() => {
    console.log(value);
  }, [value]);

  return (
    <React.Fragment>
      <Autocomplete
        multiple={multiple}
        value={value}
        isOptionEqualToValue={(option: IOptionType, value: IOptionType) =>
          option.name === value.name
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
                } else if (
                  newValue &&
                  multiple &&
                  newValue[newValue?.length - 1]?.inputValue
                ) {
                  toggleOpen(true);
                  setDialogValue(newValue[newValue?.length - 1].inputValue);
                } else {
                  setValue(newValue);
                }
              }
            : (event, newValue: any) => {
                if (typeof newValue === "string") {
                  // timeout to avoid instant validation of the dialog's form.
                  setTimeout(() => {
                    toggleOpen(true);
                    setDialogValue(newValue);
                  });
                } else if (newValue && newValue.inputValue) {
                  toggleOpen(true);
                  setDialogValue(newValue.inputValue);
                } else {
                  setValue(newValue);
                }
              }
        }
        filterOptions={(options, params) => {
          const filtered = filter(options, params);

          if (params.inputValue !== "") {
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
          if (option.inputValue) {
            return option.inputValue;
          }
          return option.name;
        }}
        selectOnFocus
        clearOnBlur
        handleHomeEndKeys
        filterSelectedOptions
        renderOption={(props, option) => <li {...props}>{option.name}</li>}
        sx={{ width: width || 300 }}
        renderInput={(params) => <TextField {...params} label={label} />}
        {...remaining}
      />
      <Dialog open={open} onClose={handleClose}>
        <form style={{ minWidth: "300px" }} onSubmit={handleSubmit}>
          <DialogTitle>
            Add a new {label?.replace("(s)", "")} "{dialogValue}"
          </DialogTitle>
          <DialogContent>
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
            <TextField
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
                    console.log({ option });
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

// import * as React from "react";
// import TextField from "@mui/material/TextField";
// import Dialog from "@mui/material/Dialog";
// import DialogTitle from "@mui/material/DialogTitle";
// import DialogContent from "@mui/material/DialogContent";
// import DialogContentText from "@mui/material/DialogContentText";
// import DialogActions from "@mui/material/DialogActions";
// import Button from "@mui/material/Button";
// import Autocomplete, { createFilterOptions } from "@mui/material/Autocomplete";
// import { FormHelperText } from "@mui/material";

// const filter = createFilterOptions<IOptionType>();

// interface ICreatableSelect {
//   options: any;
//   onAddModalSubmit: (value: any) => void;
//   value: IOptionType | IOptionType[];
//   setValue: any;
//   label: string;
//   id: string;
//   multiple?: boolean;
//   width?: string;
//   disabled?: boolean;
//   chapters?: Array<any>;
//   children?: any;
// }

// interface IOptionType {
//   name: string;
//   inputValue?: string;
//   value?: string | number;
// }

// const CreatableSelect: React.FC<ICreatableSelect> = ({
//   multiple = false,
//   options = [],
//   value,
//   setValue,
//   label,
//   id,
//   width,
//   disabled,
//   chapters,
//   onAddModalSubmit,
//   children,
//   ...remaining
// }) => {
//   const [open, toggleOpen] = React.useState(false);
//   const [chapter, setChapter] = React.useState<IOptionType>();

//   const handleClose = () => {
//     setDialogValue({
//       name: "",
//       value: "",
//     });
//     toggleOpen(false);
//   };

//   const [dialogValue, setDialogValue] = React.useState({
//     name: "",
//     value: "",
//   });

//   const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
//     event.preventDefault();
//     // Pass the actual value later
//     onAddModalSubmit(
//       chapters?.length
//         ? {
//             chapter: chapter?.name,
//             topic: dialogValue.name,
//           }
//         : dialogValue.name
//     );
//     if (multiple) {
//       setValue((prev: any) => [
//         ...prev,
//         { name: dialogValue.name, value: dialogValue.value },
//       ]);
//     } else {
//       setValue({
//         name: dialogValue.name,
//         value: dialogValue.value,
//       });
//     }
//     handleClose();
//   };

//   React.useEffect(() => {
//     console.log(value);
//   }, [value]);

//   return (
//     <React.Fragment>
//       <Autocomplete
//         multiple={multiple}
//         value={value}
//         isOptionEqualToValue={(option: IOptionType, value: IOptionType) =>
//           option.name === value.name
//         }
//         disabled={disabled || false}
//         onChange={
//           multiple
//             ? (event, newValue: any) => {
//                 if (typeof newValue === "string") {
//                   // timeout to avoid instant validation of the dialog's form.
//                   setTimeout(() => {
//                     toggleOpen(true);
//                     setDialogValue({
//                       name: newValue,
//                       value: "",
//                     });
//                   });
//                 } else if (
//                   newValue &&
//                   multiple &&
//                   newValue[newValue?.length - 1]?.inputValue
//                 ) {
//                   toggleOpen(true);
//                   setDialogValue({
//                     name: newValue[newValue?.length - 1].inputValue,
//                     value: "",
//                   });
//                 } else {
//                   setValue(newValue);
//                 }
//               }
//             : (event, newValue: any) => {
//                 if (typeof newValue === "string") {
//                   // timeout to avoid instant validation of the dialog's form.
//                   setTimeout(() => {
//                     toggleOpen(true);
//                     setDialogValue({
//                       name: newValue,
//                       value: "",
//                     });
//                   });
//                 } else if (newValue && newValue.inputValue) {
//                   toggleOpen(true);
//                   setDialogValue({
//                     name: newValue.inputValue,
//                     value: "",
//                   });
//                 } else {
//                   setValue(newValue);
//                 }
//               }
//         }
//         filterOptions={(options, params) => {
//           const filtered = filter(options, params);

//           if (params.inputValue !== "") {
//             filtered.push({
//               inputValue: params.inputValue,
//               name: `Add "${params.inputValue}"`,
//             });
//           }

//           return filtered;
//         }}
//         id={id}
//         options={options}
//         getOptionLabel={(option) => {
//           // e.g value selected with enter, right from the input
//           if (typeof option === "string") {
//             return option;
//           }
//           if (option.inputValue) {
//             return option.inputValue;
//           }
//           return option.name;
//         }}
//         selectOnFocus
//         clearOnBlur
//         handleHomeEndKeys
//         filterSelectedOptions
//         renderOption={(props, option) => <li {...props}>{option.name}</li>}
//         sx={{ width: width || 300 }}
//         renderInput={(params) => <TextField {...params} label={label} />}
//         {...remaining}
//       />
//       <Dialog open={open} onClose={handleClose}>
//         <form onSubmit={handleSubmit}>
//           <DialogTitle>Add a new {label?.replace("(s)", "")}</DialogTitle>
//           <DialogContent>
//             {/* <DialogContentText>
//               Did you miss any film in our list? Please, add it!
//             </DialogContentText> */}
//             <TextField
//               autoFocus
//               margin="dense"
//               id="name"
//               value={dialogValue.name}
//               onChange={(event) =>
//                 setDialogValue({
//                   ...dialogValue,
//                   name: event.target.value,
//                 })
//               }
//               label="Name"
//               type="text"
//               variant="standard"
//             />
//             <TextField
//               margin="dense"
//               id="value"
//               value={dialogValue.value}
//               onChange={(event) =>
//                 setDialogValue({
//                   ...dialogValue,
//                   value: event.target.value,
//                 })
//               }
//               label="Value"
//               type="text"
//               variant="standard"
//             />
//             {chapters?.length && (
//               <div style={{ marginTop: "1rem", width: "100%" }}>
//                 <Autocomplete
//                   value={chapter}
//                   isOptionEqualToValue={(
//                     option: IOptionType,
//                     value: IOptionType
//                   ) => option.name === value.name}
//                   disabled={disabled || false}
//                   onChange={(event, newValue: any) => {
//                     setChapter(newValue);
//                   }}
//                   filterOptions={(options, params) => {
//                     const filtered = filter(options, params);
//                     return filtered;
//                   }}
//                   id={id}
//                   options={chapters}
//                   getOptionLabel={(option) => {
//                     // e.g value selected with enter, right from the input
//                     console.log({ option });
//                     if (typeof option === "string") {
//                       return option;
//                     }
//                     if (option.inputValue) {
//                       return option.inputValue;
//                     }
//                     return option.name;
//                   }}
//                   selectOnFocus
//                   clearOnBlur
//                   handleHomeEndKeys
//                   filterSelectedOptions
//                   renderOption={(props, option) => (
//                     <li {...props}>{option.name}</li>
//                   )}
//                   sx={{ width: width || "100%" }}
//                   renderInput={(params) => (
//                     <TextField {...params} label={"Chapter"} />
//                   )}
//                 />
//               </div>
//             )}
//           </DialogContent>
//           <DialogActions>
//             <Button onClick={handleClose}>Cancel</Button>
//             <Button type="submit">Add</Button>
//           </DialogActions>
//         </form>
//       </Dialog>
//     </React.Fragment>
//   );
// };

// export default CreatableSelect;
