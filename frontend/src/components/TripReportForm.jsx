import { useState } from "react";

const MEETING_TYPES = [
  "Discovery",
  "Technical Deep Dive",
  "POC / Demo",
  "QBR",
  "Executive Briefing",
  "Follow-Up",
  "Workshop",
  "Other",
];

const emptyOpp = () => ({ name: "", b: "", a: "", n: "", t: "", c: "" });
const emptyAction = () => ({ nextSteps: "", owner: "", dueDate: "" });

export default function TripReportForm() {
  // -- Metadata --
  const [customer, setCustomer] = useState("");
  const [ae, setAe] = useState("");
  const [topic, setTopic] = useState("");
  const [district, setDistrict] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingType, setMeetingType] = useState(MEETING_TYPES[0]);

  // -- Image upload --
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  // -- Dynamic blocks --
  const [opps, setOpps] = useState([emptyOpp()]);
  const [actions, setActions] = useState([emptyAction()]);

  // -- Output --
  const [generatedText, setGeneratedText] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  // ---- Opp helpers ----
  const updateOpp = (idx, field, value) => {
    setOpps((prev) => prev.map((o, i) => (i === idx ? { ...o, [field]: value } : o)));
  };
  const addOpp = () => setOpps((prev) => [...prev, emptyOpp()]);
  const removeOpp = (idx) => setOpps((prev) => prev.filter((_, i) => i !== idx));

  // ---- Action helpers ----
  const updateAction = (idx, field, value) => {
    setActions((prev) => prev.map((a, i) => (i === idx ? { ...a, [field]: value } : a)));
  };
  const addAction = () => setActions((prev) => [...prev, emptyAction()]);
  const removeAction = (idx) => setActions((prev) => prev.filter((_, i) => i !== idx));

  // ---- Image upload ----
  const handleImageUpload = async () => {
    if (!imageFile) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", imageFile);
      const res = await fetch("/api/upload-image", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setImageUrl(data.url);
    } catch (err) {
      alert("Image upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  // ======== TEXT COMPILER ========
  const compileReport = () => {
    const lines = [];

    lines.push("=".repeat(60));
    lines.push("TRIP REPORT");
    lines.push("=".repeat(60));
    lines.push("");
    lines.push(`Customer:      ${customer}`);
    lines.push(`AE:            ${ae}`);
    lines.push(`District:      ${district}`);
    lines.push(`Topic:         ${topic}`);
    lines.push(`Meeting Date:  ${meetingDate}`);
    lines.push(`Meeting Type:  ${meetingType}`);
    lines.push("");

    if (imageUrl) {
      lines.push(`Participants:  [See attached image: ${imageUrl}]`);
      lines.push("");
    }

    // -- Opportunities --
    lines.push("-".repeat(60));
    lines.push("OPPORTUNITIES");
    lines.push("-".repeat(60));
    opps.forEach((opp, i) => {
      lines.push("");
      lines.push(`  Opp ${i + 1}: ${opp.name}`);
      lines.push(`    B: ${opp.b}`);
      lines.push(`    A: ${opp.a}`);
      lines.push(`    N: ${opp.n}`);
      lines.push(`    T: ${opp.t}`);
      lines.push(`    C: ${opp.c}`);
    });
    lines.push("");

    // -- Action Items --
    lines.push("-".repeat(60));
    lines.push("ACTION ITEMS");
    lines.push("-".repeat(60));
    actions.forEach((act, i) => {
      lines.push("");
      lines.push(`  ${i + 1}. Next Steps: ${act.nextSteps}`);
      lines.push(`     Owner:      ${act.owner}`);
      lines.push(`     Due Date:   ${act.dueDate}`);
    });
    lines.push("");
    lines.push("=".repeat(60));

    return lines.join("\n");
  };

  // ---- Generate ----
  const handleGenerate = () => {
    const text = compileReport();
    setGeneratedText(text);
    setSaved(false);
    setCopied(false);
  };

  // ---- Copy to clipboard ----
  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ---- Save to DB ----
  const handleSave = async () => {
    if (!generatedText) return;
    setSaving(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer,
          ae,
          meeting_date: meetingDate,
          topic,
          full_report_text: generatedText,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaved(true);
    } catch (err) {
      alert("Save failed: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ======== RENDER ========
  return (
    <div className="form-container">
      {/* ---- METADATA ---- */}
      <section className="form-section">
        <h2>Meeting Info</h2>
        <div className="field-grid">
          <label>
            Customer
            <input value={customer} onChange={(e) => setCustomer(e.target.value)} />
          </label>
          <label>
            AE
            <input value={ae} onChange={(e) => setAe(e.target.value)} />
          </label>
          <label>
            Topic
            <input value={topic} onChange={(e) => setTopic(e.target.value)} />
          </label>
          <label>
            District
            <input value={district} onChange={(e) => setDistrict(e.target.value)} />
          </label>
          <label>
            Meeting Date
            <input
              type="date"
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
            />
          </label>
          <label>
            Meeting Type
            <select value={meetingType} onChange={(e) => setMeetingType(e.target.value)}>
              {MEETING_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {/* ---- IMAGE UPLOAD ---- */}
      <section className="form-section">
        <h2>Participants Image</h2>
        <div className="image-upload-row">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files[0])}
          />
          <button onClick={handleImageUpload} disabled={!imageFile || uploading}>
            {uploading ? "Uploading..." : "Upload"}
          </button>
          {imageUrl && <span className="upload-ok">Uploaded</span>}
        </div>
        {imageUrl && (
          <img src={imageUrl} alt="Participants" className="participants-preview" />
        )}
      </section>

      {/* ---- OPPORTUNITIES ---- */}
      <section className="form-section">
        <div className="section-header">
          <h2>Opportunities</h2>
          <button className="btn-add" onClick={addOpp}>
            + Add Opp
          </button>
        </div>
        {opps.map((opp, i) => (
          <div key={i} className="dynamic-block">
            <div className="block-header">
              <strong>Opp {i + 1}</strong>
              {opps.length > 1 && (
                <button className="btn-remove" onClick={() => removeOpp(i)}>
                  Remove
                </button>
              )}
            </div>
            <div className="field-grid">
              <label>
                Name
                <input
                  value={opp.name}
                  onChange={(e) => updateOpp(i, "name", e.target.value)}
                />
              </label>
              <label>
                B
                <input
                  value={opp.b}
                  onChange={(e) => updateOpp(i, "b", e.target.value)}
                />
              </label>
              <label>
                A
                <input
                  value={opp.a}
                  onChange={(e) => updateOpp(i, "a", e.target.value)}
                />
              </label>
              <label>
                N
                <input
                  value={opp.n}
                  onChange={(e) => updateOpp(i, "n", e.target.value)}
                />
              </label>
              <label>
                T
                <input
                  value={opp.t}
                  onChange={(e) => updateOpp(i, "t", e.target.value)}
                />
              </label>
              <label>
                C
                <input
                  value={opp.c}
                  onChange={(e) => updateOpp(i, "c", e.target.value)}
                />
              </label>
            </div>
          </div>
        ))}
      </section>

      {/* ---- ACTION ITEMS ---- */}
      <section className="form-section">
        <div className="section-header">
          <h2>Action Items</h2>
          <button className="btn-add" onClick={addAction}>
            + Add Action Item
          </button>
        </div>
        {actions.map((act, i) => (
          <div key={i} className="dynamic-block">
            <div className="block-header">
              <strong>Action {i + 1}</strong>
              {actions.length > 1 && (
                <button className="btn-remove" onClick={() => removeAction(i)}>
                  Remove
                </button>
              )}
            </div>
            <div className="field-grid">
              <label>
                Next Steps
                <input
                  value={act.nextSteps}
                  onChange={(e) => updateAction(i, "nextSteps", e.target.value)}
                />
              </label>
              <label>
                Owner
                <input
                  value={act.owner}
                  onChange={(e) => updateAction(i, "owner", e.target.value)}
                />
              </label>
              <label>
                Due Date
                <input
                  type="date"
                  value={act.dueDate}
                  onChange={(e) => updateAction(i, "dueDate", e.target.value)}
                />
              </label>
            </div>
          </div>
        ))}
      </section>

      {/* ---- GENERATE ---- */}
      <section className="form-section generate-section">
        <button className="btn-generate" onClick={handleGenerate}>
          Generate Trip Report
        </button>
      </section>

      {/* ---- OUTPUT ---- */}
      {generatedText && (
        <section className="form-section output-section">
          <h2>Final Trip Report</h2>
          <textarea
            className="report-output"
            value={generatedText}
            readOnly
            rows={24}
          />
          <div className="output-actions">
            <button className="btn-copy" onClick={handleCopy}>
              {copied ? "Copied!" : "Copy to Clipboard"}
            </button>
            <button
              className="btn-save"
              onClick={handleSave}
              disabled={saving || saved}
            >
              {saved ? "Saved to DB" : saving ? "Saving..." : "Save to Database"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
