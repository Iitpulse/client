import { useState } from "react";
import { Button, InputField } from "../../components";
import styles from "./Login.module.scss";

const Login = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    console.log({ email, password });
  }

  return (
    <div className={styles.container}>
      <form onSubmit={handleSubmit}>
        <InputField
          id="email"
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
        />
        <InputField
          id="password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
        />
        <Button title="Submit" type="submit">
          Submit
        </Button>
      </form>
    </div>
  );
};

export default Login;
