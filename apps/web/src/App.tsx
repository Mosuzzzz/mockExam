import { BrowserRouter, Route, Routes } from "react-router-dom";
import { WorkspaceLayout } from "./components/WorkspaceLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { ExamPage } from "./pages/ExamPage";
import { HistoryPage } from "./pages/HistoryPage";
import { HomePage } from "./pages/HomePage";
import { ImportPage } from "./pages/ImportPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ResultPage } from "./pages/ResultPage";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/exam/:attemptId" element={<ExamPage />} />
      <Route element={<WorkspaceLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/create" element={<ImportPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/result/:attemptId" element={<ResultPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export function App() {
  return <BrowserRouter><AppRoutes /></BrowserRouter>;
}
