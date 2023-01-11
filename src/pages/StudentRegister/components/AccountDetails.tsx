import { StyledMUITextField } from "../../Users/components";
import z from "zod";
import { Button } from "../../../components";
import { useState } from "react";
import styles from "../StudentRegister.module.scss";

const AccountDetailsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(50),
  confirmPassword: z.string().min(8).max(50),
  joiningCode: z.string().length(6),
});
export type AccountDetailsValues = z.infer<typeof AccountDetailsSchema>;

const defaultState: AccountDetailsValues = {
  email: "",
  password: "",
  confirmPassword: "",
  joiningCode: "",
};

function getErrorDefaultState(valuesObj: typeof defaultState) {
  const errorObj: any = {};
  Object.keys(valuesObj).forEach((key) => {
    errorObj[key] = false;
  });
  return errorObj;
}

interface Props {
  handleSubmit: (values: AccountDetailsValues) => void;
}

const AccountDetails: React.FC<Props> = ({ handleSubmit }) => {
  const [values, setValues] = useState<AccountDetailsValues>(defaultState);
  const [errors, setErrors] = useState({
    ...getErrorDefaultState(defaultState),
  });
  const [helperTexts, setHelperTexts] = useState(defaultState);

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
    const isValid = AccountDetailsSchema.safeParse(values);
    if (!isValid.success) {
      console.log(isValid);
      isValid.error.issues.forEach((issue) => {
        setErrors((prevState: any) => ({
          ...prevState,
          [issue.path[0]]: true,
        }));
        setHelperTexts((prevState) => ({
          ...prevState,
          [issue.path[0]]: issue.message?.replace(
            "String",
            [issue.path[0]].toString().toUpperCase() || ""
          ),
        }));
      });
      return;
    }
    if (values.password !== values.confirmPassword) {
      setErrors((prevState: any) => ({
        ...prevState,
        password: true,
        confirmPassword: true,
      }));
      setHelperTexts((prevState) => ({
        ...prevState,
        password: "Passwords don't match",
        confirmPassword: "Passwords don't match",
      }));
      return;
    }
    handleSubmit(isValid.data);
  }

  return (
    <form onSubmit={handleSubmitForm} className={styles.regForm}>
      <StyledMUITextField
        required
        id="email"
        type="email"
        autoComplete="email"
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
        autoComplete="new-password"
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
        autoComplete="new-password"
        value={values.confirmPassword}
        error={errors.confirmPassword}
        helperText={helperTexts.confirmPassword}
        type="password"
        onChange={handleChangeValues}
        label="Confirm Password"
        variant="outlined"
      />
      <StyledMUITextField
        required
        id="joiningCode"
        value={values.joiningCode}
        error={errors.joiningCode}
        helperText={helperTexts.joiningCode}
        type="text"
        onChange={handleChangeValues}
        label="Joining Code"
        variant="outlined"
      />
      <Button type="submit">Next</Button>
    </form>
  );
};

export default AccountDetails;
