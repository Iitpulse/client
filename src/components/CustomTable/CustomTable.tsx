import React, { useEffect, useRef, useState } from "react";
import { SearchOutlined } from "@ant-design/icons";
import { Button, Input, Space, Table, message } from "antd";
import type { ColumnsType, ColumnType } from "antd/es/table";
import type { FilterConfirmProps } from "antd/es/table/interface";

interface Props {
  dataSource: Array<any>;
  columns: ColumnsType<any>;
  loading?: boolean;
  selectable?: boolean;
  scroll?: any;
  selectedRows?: Array<any>;
  setSelectedRows?: (rows: Array<any>) => void;
  expandable?: any;
  pagination?: any;
  maxSelectedRows?: number;
}

const CustomTable: React.FC<Props> = ({
  dataSource,
  columns,
  loading,
  selectable,
  scroll,
  expandable,
  setSelectedRows,
  pagination,
  selectedRows,
  maxSelectedRows,
}) => {
  const [searchText, setSearchText] = useState("");
  const [searchedColumn, setSearchedColumn] = useState("");
  const searchInput = useRef<any>(null);
  const [data, setData] = useState<any>([]);
  const [cols, setCols] = useState<any>([]);
  const [tableLoading, setTableLoading] = useState(false);
  // console.log({ maxSelectedRows });
  useEffect(() => {
    if (loading !== undefined) {
      setTableLoading(loading);
    }
  }, [loading]);

  useEffect(() => {
    setData(dataSource);
  }, [dataSource]);

  const handleSearch = (
    selectedKeys: string[],
    confirm: (param?: FilterConfirmProps) => void,
    dataIndex: any
  ) => {
    confirm();
    setSearchText(selectedKeys[0]);
    setSearchedColumn(dataIndex);
  };

  const handleReset = (clearFilters: () => void) => {
    clearFilters();
    setSearchText("");
  };

  const getColumnSearchProps = (dataIndex: any): any => ({
    filterDropdown: ({
      setSelectedKeys,
      selectedKeys,
      confirm,
      clearFilters,
    }: any) => (
      <div style={{ padding: 8 }}>
        <Input
          ref={searchInput}
          placeholder={`Search ${dataIndex}`}
          value={selectedKeys[0]}
          onChange={(e) =>
            setSelectedKeys(e.target.value ? [e.target.value] : [])
          }
          onPressEnter={() =>
            handleSearch(selectedKeys as string[], confirm, dataIndex)
          }
          style={{ marginBottom: 8, display: "block" }}
        />
        <Space>
          <Button
            type="primary"
            onClick={() =>
              handleSearch(selectedKeys as string[], confirm, dataIndex)
            }
            icon={<SearchOutlined />}
            size="small"
            style={{ width: 90 }}
          >
            Search
          </Button>
          <Button
            onClick={() => clearFilters && handleReset(clearFilters)}
            size="small"
            style={{ width: 90 }}
          >
            Reset
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => {
              confirm({ closeDropdown: false });
              setSearchText((selectedKeys as string[])[0]);
              setSearchedColumn(dataIndex);
            }}
          >
            Filter
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered: boolean) => (
      <SearchOutlined style={{ color: filtered ? "#1890ff" : undefined }} />
    ),
    onFilter: (value: any, record: any) =>
      record[dataIndex]
        .toString()
        .toLowerCase()
        .includes((value as string).toLowerCase()),
    onFilterDropdownOpenChange: (visible: any) => {
      if (visible) {
        setTimeout(() => searchInput.current?.select(), 100);
      }
    },
  });

  useEffect(() => {
    if (columns?.length) {
      const newCols = columns.map((col: any) => {
        return !col.searchable
          ? col
          : {
              ...col,
              ...getColumnSearchProps(col.dataIndex),
            };
      });
      setCols(newCols);
    }
  }, [columns]);
  // console.log({ selectedRows });
  const rowSelection = {
    onChange: (selRowKeys: any, selRows: any) => {
      if (maxSelectedRows && selRows.length > maxSelectedRows) {
        // message.error(`Maximum ${maxSelectedRows} questions can be selected`);
        return;
      }
      if (setSelectedRows) {
        setSelectedRows(selRows);
      }
      console.log(`selRowKeys: ${selRowKeys}`, "selRows: ", selRows);
    },
    onSelect: (record: any, selected: any, selRows: any) => {
      console.log({ record, selected, selRows });
      if (maxSelectedRows && selRows.length > maxSelectedRows) {
        message.error(`Maximum ${maxSelectedRows} questions can be selected`);
        selRows = selRows.filter((row: any) => row._id !== record._id);
        selected = false;
        return;
      }
      if (setSelectedRows) {
        setSelectedRows(selRows);
      }
    },
    onSelectAll: (selected: any, selRows: any, changeRows: any) => {
      console.log(selected, selRows, changeRows);
      if (setSelectedRows) {
        setSelectedRows(selRows.splice(0, maxSelectedRows));
      }
    },
    selectedRowKeys: selectedRows?.some((row) => typeof row === typeof "")
      ? selectedRows
      : selectedRows?.map((row) => row.id || row._id),
  };

  return (
    <Table
      dataSource={data}
      columns={cols}
      loading={tableLoading}
      rowSelection={selectable ? rowSelection : undefined}
      expandable={expandable}
      scroll={
        scroll || {
          y: "70vh",
          x: "100vw",
        }
      }
      pagination={pagination}
    />
  );
};

export default CustomTable;
