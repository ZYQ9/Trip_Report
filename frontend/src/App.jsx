import { useState } from "react";
import TripReportForm from "./components/TripReportForm.jsx";
import SearchReports from "./components/SearchReports.jsx";

let nextTabId = 2;

export default function App() {
  const [view, setView] = useState("form"); // "form" | "search"
  const [tabs, setTabs] = useState([{ id: 1, label: "Report 1" }]);
  const [activeTab, setActiveTab] = useState(1);

  const addTab = () => {
    const id = nextTabId++;
    setTabs((prev) => [...prev, { id, label: `Report ${id}` }]);
    setActiveTab(id);
    setView("form");
  };

  const closeTab = (id) => {
    if (tabs.length === 1) return;
    if (!window.confirm("Close this tab? Unsaved data will be lost.")) return;
    const remaining = tabs.filter((t) => t.id !== id);
    setTabs(remaining);
    if (activeTab === id) {
      setActiveTab(remaining[remaining.length - 1].id);
    }
  };

  const renameTab = (id, newLabel) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === id ? { ...t, label: newLabel } : t))
    );
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Trip Report Generator</h1>
        <nav className="tab-nav">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={
                view === "form" && activeTab === tab.id
                  ? "tab report-tab active"
                  : "tab report-tab"
              }
              onClick={() => {
                setActiveTab(tab.id);
                setView("form");
              }}
            >
              <span className="tab-label">{tab.label}</span>
              {tabs.length > 1 && (
                <button
                  className="tab-close"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button className="tab tab-add" onClick={addTab} title="New report tab">
            +
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
        {tabs.map((tab) => (
          <div
            key={tab.id}
            style={{
              display: view === "form" && activeTab === tab.id ? "block" : "none",
            }}
          >
            <TripReportForm
              onCustomerChange={(name) =>
                renameTab(tab.id, name || `Report ${tab.id}`)
              }
            />
          </div>
        ))}
        {view === "search" && <SearchReports />}
      </main>
    </div>
  );
}
