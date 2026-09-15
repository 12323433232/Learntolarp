import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import LandingPage from "@/pages/LandingPage";
import EntityPage from "@/pages/EntityPage";
import SiteFrame from "@/components/SiteFrame";
import { ThemeProvider } from "@/lib/ThemeContext";

function App() {
  return (
    <div className="App">
      <ThemeProvider>
        <BrowserRouter>
          <SiteFrame>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/entity/:slug" element={<EntityPage />} />
            </Routes>
          </SiteFrame>
        </BrowserRouter>
      </ThemeProvider>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            fontFamily: "JetBrains Mono, monospace",
            fontSize: "12px",
            background: "var(--ink)",
            color: "var(--paper)",
            border: "1px solid var(--ink-soft)",
            borderRadius: "2px",
          },
        }}
      />
    </div>
  );
}

export default App;
