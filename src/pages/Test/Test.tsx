import {
  DataGrid,
  GridToolbarContainer,
  GridToolbarColumnsButton,
  GridToolbarFilterButton,
  GridToolbarExport,
  GridToolbarDensitySelector,
} from "@mui/x-data-grid";
import { useDemoData } from "@mui/x-data-grid-generator";
import { useEffect } from "react";

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
  const { data } = useDemoData({
    dataSet: "Commodity",
    rowLength: 10,
    maxColumns: 6,
  });

  useEffect(() => {
    console.log({ data });
  }, [data]);

  return (
    <div style={{ height: 400, width: "100%" }}>
      <DataGrid
        {...data}
        components={{
          Toolbar: CustomToolbar,
        }}
      />
    </div>
  );
};

export default Test;
