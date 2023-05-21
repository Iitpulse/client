import { PlusOutlined } from "@ant-design/icons";
import { Button, Divider, Form, Input, InputRef, Select, Space } from "antd";
import { useRef, useState } from "react";
const { Option } = Select;

interface SelectOption {
  label: string;
  value: string;
}
interface Props {
  options: SelectOption[];
  values?: string[];
  onChange?: (values: string[]) => void;
  showSearch?: boolean;
  placeholder?: string;
  onAddNewItem?: (name: string) => void;
  disabled?: boolean;
  mode?: "multiple" | "tags" | undefined;
}

const CustomCreatableSelect: React.FC<Props> = ({
  options,
  values,
  onChange,
  showSearch,
  placeholder,
  onAddNewItem,
  disabled,
  mode = undefined,
}) => {
  const [newEntry, setNewEntry] = useState<string>("");
  const inputRef = useRef<InputRef>(null);

  function handleValueChange(e: React.ChangeEvent<HTMLInputElement>) {
    setNewEntry(e.target.value);
  }

  function handleClickAddNew() {
    if (onAddNewItem) {
      onAddNewItem(newEntry);
    }
    setNewEntry("");
  }

  return (
    <Form.Item label={placeholder}>
      <Select
        mode={mode}
        showSearch={showSearch}
        value={values}
        placeholder={placeholder || "Select items"}
        defaultActiveFirstOption={false}
        showArrow={false}
        filterOption={true}
        // onSearch={onSearch}
        onChange={onChange}
        notFoundContent={null}
        disabled={disabled}
        dropdownRender={(menu) => (
          <>
            {menu}
            <Divider style={{ margin: "8px 0" }} />
            <Space style={{ padding: "0 8px 4px" }}>
              <Input
                placeholder="Please enter item"
                ref={inputRef}
                value={newEntry}
                onChange={handleValueChange}
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
      >
        {options.map((item: SelectOption) => (
          <Option key={item.value}>{item.label}</Option>
        ))}
      </Select>
    </Form.Item>
  );
};

export default CustomCreatableSelect;
