import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { WorkspaceLayout } from "./components/WorkspaceLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { ExamPage } from "./pages/ExamPage";
import { HistoryPage } from "./pages/HistoryPage";
import { ImportPage } from "./pages/ImportPage";
import { ResultPage } from "./pages/ResultPage";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/exam/:attemptId" element={<ExamPage />} />
      <Route element={<WorkspaceLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/create" element={<ImportPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/result/:attemptId" element={<ResultPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export function App() {
  return <BrowserRouter><AppRoutes /></BrowserRouter>;
}
