import { useContext, useEffect, useState } from "react";
import {
  DataGrid,
  GridToolbarContainer,
  GridToolbarColumnsButton,
  GridToolbarFilterButton,
  GridToolbarExport,
  GridToolbarDensitySelector,
  GridValueGetterParams,
} from "@mui/x-data-grid";
import { Tab, Tabs } from "@mui/material";
import { useDemoData } from "@mui/x-data-grid-generator";
import styles from "./Test.module.scss";
import { Button, Modal, Sidebar } from "../../components";
import { TestContext } from "../../utils/contexts/TestContext";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && children}
    </div>
  );
}

function CustomToolbar() {
  return (
    <GridToolbarContainer>
      <GridToolbarColumnsButton touchRippleRef={null} />
      <GridToolbarFilterButton />
      <GridToolbarDensitySelector touchRippleRef={null} />
      <GridToolbarExport touchRippleRef={null} />
    </GridToolbarContainer>
  );
}

const Test = () => {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);

  function handleChangeTab(event: React.ChangeEvent<{}>, newValue: number) {
    setTab(newValue);
  }

  const cols = [
    {
      field: "id",
      headerName: "ID",
    },
    {
      field: "name",
      headerName: "Test",
    },
    {
      field: "exam",
      headerName: "Exam",
      valueGetter: (params: GridValueGetterParams) => {
        return params.row.name;
      },
    },
    {
      field: "createdAt",
      headerName: "Timing",
      valueGetter: (params: GridValueGetterParams) => {
        return new Date(params.row.createdAt).toLocaleString();
      },
      width: 200,
    },
    {
      field: "status",
      headerName: "Status",
    },
  ];

  const [data, setData] = useState<any>({
    columns: cols,
    rows: [],
  });

  const { state } = useContext(TestContext);
  const { tests } = state;

  useEffect(() => {
    if (tests?.length) {
      setData((prev: any) => ({ ...prev, rows: tests }));
      setLoading(false);
    }
  }, [tests]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Tabs value={tab} onChange={handleChangeTab}>
          <Tab label="Ongoing" />
          <Tab label="Active" />
          <Tab label="Inactive" />
          <Tab label="Expired" />
        </Tabs>
        <Button onClick={() => setOpenModal(true)}>Add New</Button>
      </div>
      <TabPanel value={tab} index={0}>
        <div className={styles.data} style={{ height: 400, width: "100%" }}>
          <DataGrid
            {...data}
            components={{
              Toolbar: CustomToolbar,
            }}
            checkboxSelection
            disableSelectionOnClick
            loading={loading}
          />
        </div>
      </TabPanel>
      <Sidebar title="Recent Activity">Recent</Sidebar>
      <Modal
        isOpen={openModal}
        onClose={() => setOpenModal(false)}
        title="CreateTest"
        backdrop
      >
        Content
      </Modal>
    </div>
  );
};

export default Test;
