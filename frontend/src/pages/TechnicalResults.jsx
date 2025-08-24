import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import DashboardLayout from "../components/layout/DashboardLayout";
import ResultsTable from "../components/ResultsTable";
import { getAnalysis } from "../store/slicers/technicalSlice";

export default function TechnicalResults() {
  const dispatch = useDispatch();
  const { query } = useSelector((s) => s.technicals);

  // initial load with saved query in store
  // useEffect(() => {
  //   dispatch(getAnalysis(query));
  // }, [dispatch]);

  return (
    <DashboardLayout>
      <h2 className="mb-4 text-xl font-semibold">Detailed Results</h2>
      <ResultsTable />
    </DashboardLayout>
  );
}
