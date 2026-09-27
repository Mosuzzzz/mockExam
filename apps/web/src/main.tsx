import "@fontsource-variable/dm-sans";
import React from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/react";
import { App } from "./App";
import { SetupPage } from "./pages/SetupPage";
import "./styles.css";

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || import.meta.env.CLERK_PUBLISHABLE_KEY;

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {publishableKey ? (
      <ClerkProvider publishableKey={publishableKey}>
        <App />
      </ClerkProvider>
    ) : (
      <SetupPage />
    )}
  </React.StrictMode>,
);
