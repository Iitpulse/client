import { Button, InputField } from "../../components";
import styles from "./Home.module.scss"
import {useState} from "react";


const Home = () => {
const [name,setName]=useState<string>("");
  return (
    <div className={styles.container}>
      <section>
        <h1>Button</h1>
        <Button>Btn</Button>
        <InputField id="some-button" type= "text" label="Name" value={name} required onChange={(e)=>setName(e.target.value)} />
      </section>
    </div>
  );
};



export default Home;
