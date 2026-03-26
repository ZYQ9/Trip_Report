import { useState } from "react";
import TripReportForm from "./components/TripReportForm.jsx";
import SearchReports from "./components/SearchReports.jsx";

export default function App() {
  const [view, setView] = useState("form"); // "form" | "search"

  return (
    <div className="app">
      <header className="app-header">
        <h1>Trip Report Generator</h1>
        <nav className="tab-nav">
          <button
            className={view === "form" ? "tab active" : "tab"}
            onClick={() => setView("form")}
          >
            New Report
          </button>
          <button
            className={view === "search" ? "tab active" : "tab"}
            onClick={() => setView("search")}
          >
            Search Reports
          </button>
        </nav>
      </header>

      <main className="app-main">
        {view === "form" ? <TripReportForm /> : <SearchReports />}
      </main>
    </div>
  );
}
