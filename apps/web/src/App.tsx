import { useAuth } from "@clerk/react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { LoadingState } from "./components/Feedback";
import { WorkspaceLayout } from "./components/WorkspaceLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { ExamPage } from "./pages/ExamPage";
import { HistoryPage } from "./pages/HistoryPage";
import { ImportPage } from "./pages/ImportPage";
import { LandingPage } from "./pages/LandingPage";
import { ResultPage } from "./pages/ResultPage";

function RouteGate() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) {
    return <main className="auth-loading"><LoadingState label="Opening your workspace" /></main>;
  }
  if (!isSignedIn) return <LandingPage />;

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
  return <BrowserRouter><RouteGate /></BrowserRouter>;
}
