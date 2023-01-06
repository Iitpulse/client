import { StyledMUITextField } from "../../Users/components";
import z from "zod";
import { Button } from "../../../components";
import { useState } from "react";
import styles from "../StudentRegister.module.scss";

const PersonalDetailsSchema = z.object({
  name: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8).max(50),
  confirmPassword: z.string().min(8).max(50),
});

export type PersonalDetailsValues = z.infer<typeof PersonalDetailsSchema>;

interface Props {
  handleSubmit: (values: PersonalDetailsValues) => void;
}

const PersonalDetails: React.FC<Props> = ({ handleSubmit }) => {
  const [values, setValues] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({
    name: false,
    email: false,
    password: false,
    confirmPassword: false,
  });
  const [helperTexts, setHelperTexts] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  function handleChangeValues(e: React.ChangeEvent<HTMLInputElement>) {
    const { id, value } = e.target;
    setValues((prevState) => ({
      ...prevState,
      [id]: value,
    }));
  }

  function handleSubmitForm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const isValid = PersonalDetailsSchema.safeParse(values);
    if (!isValid.success) {
      console.log(isValid);
      isValid.error.issues.forEach((issue) => {
        setErrors((prevState) => ({
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
        id="name"
        required
        label="Name"
        value={values.name}
        onChange={handleChangeValues}
        variant="outlined"
      />
      <StyledMUITextField
        required
        id="email"
        type="email"
        error={errors.email}
        value={values.email}
        helperText={helperTexts.email}
        onChange={handleChangeValues}
        label="Email"
        variant="outlined"
      />
      <StyledMUITextField
        required
        id="password"
        value={values.password}
        error={errors.password}
        helperText={helperTexts.password}
        type="password"
        onChange={handleChangeValues}
        label="Password"
        variant="outlined"
      />
      <StyledMUITextField
        required
        id="confirmPassword"
        value={values.confirmPassword}
        error={errors.confirmPassword}
        helperText={helperTexts.confirmPassword}
        type="password"
        onChange={handleChangeValues}
        label="Confirm Password"
        variant="outlined"
      />
      <Button type="submit">Create Account</Button>
    </form>
  );
};

export default PersonalDetails;
