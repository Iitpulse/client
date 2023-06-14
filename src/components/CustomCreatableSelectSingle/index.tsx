import { PlusOutlined } from "@ant-design/icons";
import { Button, Divider, Form, Input, InputRef, Select, Space } from "antd";
import { useRef, useState } from "react";
const { Option } = Select;

interface SelectOption {
  label: string;
  value: string;
  [key: string]: any;
}
interface Props {
  options: SelectOption[];
  value?: string;
  onChange?: (value: string, chosenOption?: any) => void;
  showSearch?: boolean;
  placeholder?: string;
  newItemPlaceholder?: string;
  onAddNewItem?: (name: string) => void;
  disabled?: boolean;
  showAddNew?: boolean;
}

const CustomCreatableSelectSingle: React.FC<Props> = ({
  options,
  value,
  onChange,
  showSearch,
  placeholder,
  newItemPlaceholder,
  onAddNewItem,
  disabled,
  showAddNew = true,
}) => {
  const [newEntry, setNewEntry] = useState<string>("");
  const [inputStatus, setInputStatus] = useState<"" | "error" | "warning">("");
  const inputRef = useRef<InputRef>(null);

  function handleValueChange(e: React.ChangeEvent<HTMLInputElement>) {
    setNewEntry(e.target.value);
  }

  function handleClickAddNew() {
    setInputStatus("");
    if (!newEntry?.length) {
      setInputStatus("error");
      return;
    }
    if (onAddNewItem) {
      onAddNewItem(newEntry);
    }
    setNewEntry("");
  }

  return (
    <Select
      showSearch={showSearch}
      value={value}
      placeholder={placeholder || "Select Item"}
      defaultActiveFirstOption={false}
      filterOption={true}
      // onSearch={onSearch}
      onChange={onChange}
      disabled={disabled}
      dropdownRender={(menu) => (
        <>
          {menu}
          {showAddNew && (
            <>
              <Divider style={{ margin: "8px 0" }} />
              <Space style={{ padding: "0 8px 4px" }}>
                <Input
                  placeholder={newItemPlaceholder || "Please enter item"}
                  ref={inputRef}
                  value={newEntry}
                  onChange={handleValueChange}
                  onPressEnter={handleClickAddNew}
                  status={inputStatus}
                />
                <Button
                  type="text"
                  icon={<PlusOutlined />}
                  onClick={handleClickAddNew}
                >
                  Add item
                </Button>
              </Space>
            </>
          )}
        </>
      )}
    >
      {options?.map((item: SelectOption) => (
        <Option key={item.value} {...item}>
          {item.label}
        </Option>
      ))}
    </Select>
  );
};

export default CustomCreatableSelectSingle;
