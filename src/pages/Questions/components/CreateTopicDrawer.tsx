import { Button, Drawer, Form, Input, Space, message } from "antd";
import CustomCreatableSelectSingle from "../../../components/CustomCreatableSelectSingle";
import { useState } from "react";

const CreateTopicDrawer: React.FC<{
  open: boolean;
  onClose: () => void;
  chapterOptions: Array<{
    label: string;
    value: string;
    topics: string[];
  }>;
  onClickAddTopic: (topicName: { topic: string; chapter: string }) => void;
}> = ({ open, onClose, chapterOptions, onClickAddTopic }) => {
  const [chapter, setChapter] = useState<string>("");
  const [topic, setTopic] = useState<string>("");

  function handleClickAdd() {
    if (!topic?.length) return message.error("Please enter topic name");
    if (!chapter) return message.error("Please select chapter");
    onClickAddTopic({
      topic,
      chapter: chapter,
    });
  }

  return (
    <Drawer
      title="Add Topic"
      onClose={onClose}
      open={open}
      extra={
        <Space>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" onClick={handleClickAdd}>
            OK
          </Button>
        </Space>
      }
    >
      <Form layout="vertical">
        <Form.Item label="Chapter">
          <CustomCreatableSelectSingle
            options={chapterOptions?.map((chapter: any) => ({
              label: chapter.name,
              value: chapter.name,
              ...chapter,
            }))}
            placeholder="Select Chapter"
            showAddNew={false}
            value={chapter}
            onChange={(chap: string) => {
              setChapter(chap);
            }}
          />
        </Form.Item>
        <Form.Item label="Topic Name">
          <Input
            onChange={(e) => setTopic(e.target.value)}
            value={topic}
            required
          />
        </Form.Item>
      </Form>
    </Drawer>
  );
};

export default CreateTopicDrawer;
