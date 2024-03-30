import { Button, Result } from "antd";
import styles from "./NotFoundPage.module.scss";
import logo from "../../assets/images/logo.svg";

const NotFoundPage = () => {
  return (
    <div className={styles.container}>
      <div>
        <img src={logo} className={styles.logo} alt="iitpulse" />
      </div>
      <Result
        status="404"
        title="404"
        subTitle="Sorry, the page you requested does not exist."
        extra={
          <Button type="primary" href="/">
            Back Home
          </Button>
        }
      />
    </div>
  );
};

export default NotFoundPage;
