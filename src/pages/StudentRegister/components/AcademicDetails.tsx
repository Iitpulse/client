import { StyledMUITextField } from "../../Users/components";
import z from "zod";
import { Button, StyledMUISelect } from "../../../components";
import { useState } from "react";
import styles from "../StudentRegister.module.scss";

const AcademicDetailsSchema = z.object({
  school: z.string().min(3).max(50),
  standard: z.string(),
  medium: z.string(),
  stream: z.string(),
});

const defaultState = {
  school: "",
  standard: "",
  medium: "",
  stream: "",
};

function getErrorDefaultState(valuesObj: typeof defaultState) {
  const errorObj: any = {};
  Object.keys(valuesObj).forEach((key) => {
    errorObj[key] = false;
  });
  return errorObj;
}

export type AcademicDetailsValues = z.infer<typeof AcademicDetailsSchema>;

interface Props {
  handleSubmit: (values: AcademicDetailsValues) => void;
}

const AcademicDetails: React.FC<Props> = ({ handleSubmit }) => {
  const [values, setValues] = useState(defaultState);
  const [errors, setErrors] = useState(getErrorDefaultState(defaultState));
  const [helperTexts, setHelperTexts] = useState(defaultState);
  const [stream, setStream] = useState("");
  const [standard, setStandard] = useState("");
  const [medium, setMedium] = useState("");

  function handleChangeValues(e: React.ChangeEvent<HTMLInputElement>) {
    const { id, value } = e.target;
    setValues((prevState) => ({
      ...prevState,
      [id]: value,
    }));
  }

  function handleSubmitForm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors(getErrorDefaultState(defaultState));
    setHelperTexts(defaultState);
    const finalValues: AcademicDetailsValues = {
      ...values,
      standard,
      medium,
      stream,
    };
    const isValid = AcademicDetailsSchema.safeParse(finalValues);
    if (!isValid.success) {
      console.log(isValid);
      isValid.error.issues.forEach((issue) => {
        setErrors((prevState: any) => ({
          ...prevState,
          [issue.path[0]]: true,
        }));
        setHelperTexts((prevState) => ({
          ...prevState,
          [issue.path[0]]: issue.message,
        }));
      });
      return;
    }
    handleSubmit(isValid.data);
  }

  return (
    <form onSubmit={handleSubmitForm} className={styles.regForm}>
      <StyledMUITextField
        id="school"
        required
        label="School"
        error={errors.school}
        helperText={helperTexts.school}
        value={values.school}
        onChange={handleChangeValues}
        variant="outlined"
      />
      <StyledMUISelect
        options={[
          { name: "11", value: "11" },
          { name: "12", value: "12" },
          { name: "dropper", value: "dropper" },
        ]}
        value={standard}
        label="Standard"
        onChange={setStandard}
      />
      <StyledMUISelect
        options={[
          { name: "Hindi", value: "hindi" },
          { name: "English", value: "english" },
        ]}
        value={medium}
        label="Medium"
        onChange={setMedium}
      />
      <StyledMUISelect
        options={[
          { name: "PCM", value: "pcm" },
          { name: "PCB", value: "pcb" },
          { name: "PCMB", value: "pcmb" },
          { name: "Arts", value: "arts" },
          { name: "Commerce", value: "commerce" },
        ]}
        value={stream}
        label="Stream"
        onChange={setStream}
      />

      <Button type="submit">Submit</Button>
    </form>
  );
};

export default AcademicDetails;
