import { ChangeEventHandler, HTMLInputTypeAttribute } from "react";
import styles from "./InputField.module.scss";

interface Props{
    id:string;
    label:string;
    type:HTMLInputTypeAttribute;
    placeholder?:string;
    disabled?:boolean;
    value:string ;
    onChange:(event:React.ChangeEvent<HTMLInputElement>)=>void;
    [x:string]:any;
}

const InputField = (props:Props) => {
    const {id,type,label,placeholder,disabled,value,onChange,...rest}=props;
    return (
        <div>
            <label htmlFor={id}>{label}</label>
            <input id={id} type={type} placeholder={placeholder} disabled={disabled} value={value} onChange={onChange} {...rest}/>
        </div>
    )
}

export default InputField
