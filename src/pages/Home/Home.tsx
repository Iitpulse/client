import { Button, InputField } from "../../components";
import {useState} from "react";


const Home = () => {
const [name,setName]=useState<string>("");
  return (
    <div>
      <section>
        <h1>Button</h1>
        <Button title="Test Btn" type="button">
          Btn
        </Button>
        <InputField id="some-button" type="text" label="Name" value={name} onChange={(e)=>setName(e.target.value)} />
      </section>
    </div>
  );
};

export default Home;
