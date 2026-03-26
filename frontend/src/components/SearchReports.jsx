import { useState } from "react";

export default function SearchReports() {
  const [filters, setFilters] = useState({
    customer: "",
    ae: "",
    topic: "",
    date_from: "",
    date_to: "",
    q: "",
  });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const updateFilter = (field, value) =>
    setFilters((prev) => ({ ...prev, [field]: value }));

  const handleSearch = async () => {
    setLoading(true);
    setExpanded(null);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params.append(k, v);
      });
      const res = await fetch(`/api/reports?${params}`);
      if (!res.ok) throw new Error("Search failed");
      setResults(await res.json());
    } catch (err) {
      alert("Search error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text) => {
    await navigator.clipboard.writeText(text);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this trip report? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/reports/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setResults((prev) => prev.filter((r) => r.id !== id));
      setExpanded(null);
    } catch (err) {
      alert("Delete error: " + err.message);
    }
  };

  return (
    <div className="search-container">
      <section className="form-section">
        <h2>Search Filters</h2>
        <div className="field-grid">
          <label>
            Customer
            <input
              value={filters.customer}
              onChange={(e) => updateFilter("customer", e.target.value)}
            />
          </label>
          <label>
            AE
            <input
              value={filters.ae}
              onChange={(e) => updateFilter("ae", e.target.value)}
            />
          </label>
          <label>
            Topic
            <input
              value={filters.topic}
              onChange={(e) => updateFilter("topic", e.target.value)}
            />
          </label>
          <label>
            From Date
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => updateFilter("date_from", e.target.value)}
            />
          </label>
          <label>
            To Date
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => updateFilter("date_to", e.target.value)}
            />
          </label>
          <label>
            Free Text Search
            <input
              value={filters.q}
              onChange={(e) => updateFilter("q", e.target.value)}
              placeholder="Search all fields..."
            />
          </label>
        </div>
        <button
          className="btn-generate"
          onClick={handleSearch}
          disabled={loading}
          style={{ marginTop: "1rem" }}
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </section>

      {/* Results */}
      <section className="form-section">
        <h2>Results ({results.length})</h2>
        {results.length === 0 && !loading && (
          <p className="no-results">No reports found. Try adjusting your filters.</p>
        )}
        <div className="results-list">
          {results.map((r) => (
            <div key={r.id} className="result-card">
              <div
                className="result-header"
                onClick={() => setExpanded(expanded === r.id ? null : r.id)}
              >
                <div className="result-meta">
                  <strong>{r.customer}</strong>
                  <span className="result-divider">|</span>
                  <span>{r.ae}</span>
                  <span className="result-divider">|</span>
                  <span>{r.meeting_date}</span>
                  <span className="result-divider">|</span>
                  <span className="result-topic">{r.topic}</span>
                </div>
                <span className="expand-arrow">
                  {expanded === r.id ? "\u25B2" : "\u25BC"}
                </span>
              </div>
              {expanded === r.id && (
                <div className="result-body">
                  <textarea
                    className="report-output"
                    value={r.full_report_text}
                    readOnly
                    rows={20}
                  />
                  <div className="output-actions">
                    <button
                      className="btn-copy"
                      onClick={() => handleCopy(r.full_report_text)}
                    >
                      Copy to Clipboard
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(r.id)}
                    >
                      Delete Report
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
