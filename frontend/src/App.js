import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import LandingPage from "@/pages/LandingPage";
import EntityPage from "@/pages/EntityPage";
import SiteFrame from "@/components/SiteFrame";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <SiteFrame>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/entity/:slug" element={<EntityPage />} />
          </Routes>
        </SiteFrame>
      </BrowserRouter>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            fontFamily: "JetBrains Mono, monospace",
            fontSize: "12px",
            background: "#0f172a",
            color: "#f8fafc",
            border: "1px solid #1e293b",
            borderRadius: "2px",
          },
        }}
      />
    </div>
  );
}

export default App;
