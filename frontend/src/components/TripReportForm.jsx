import { useState, useRef } from "react";

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

const MEETING_FORMATS = ["#Virtual", "#Onsite"];

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
  const [meetingFormat, setMeetingFormat] = useState(MEETING_FORMATS[0]);
  const [crmLink, setCrmLink] = useState("");

  // -- Free text areas --
  const [techProfile, setTechProfile] = useState("");
  const [meetingNotes, setMeetingNotes] = useState("");
  const [summary, setSummary] = useState("");

  // -- Attendees (toggled sections) --
  const [showShi, setShowShi] = useState(false);
  const [showCustomer, setShowCustomer] = useState(false);
  const [showPartner, setShowPartner] = useState(false);
  const [shiAttendees, setShiAttendees] = useState("");
  const [customerAttendees, setCustomerAttendees] = useState("");
  const [partnerAttendees, setPartnerAttendees] = useState("");

  // -- Dynamic blocks --
  const [opps, setOpps] = useState([emptyOpp()]);
  const [actions, setActions] = useState([emptyAction()]);

  // -- Output --
  const [generatedHtml, setGeneratedHtml] = useState("");
  const [generatedText, setGeneratedText] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const previewRef = useRef(null);

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

  // ---- Format date nicely ----
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // ======== HTML COMPILER (for email) ========
  const compileHtml = () => {
    const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const nl2br = (s) => esc(s).replace(/\n/g, "<br>");

    let html = `
<div style="font-family: Calibri, Arial, sans-serif; color: #222; max-width: 700px; line-height: 1.6;">

  <h1 style="margin: 0 0 4px 0; font-size: 22px; color: #000;">Trip Report</h1>
  <div style="color: #666; font-size: 13px; margin-bottom: 16px;">${formatDate(meetingDate)}</div>

  <div style="margin-bottom: 16px; font-size: 14px;">
    ${crmLink ? `<strong>CRM:</strong> <a href="${esc(crmLink)}" style="color: #1a73e8;">${esc(crmLink)}</a><br>` : ""}
    <strong>${esc(meetingFormat)}</strong><br>
    <strong>Customer:</strong> ${esc(customer)}<br>
    <strong>AE:</strong> ${esc(ae)}<br>
    <strong>Topic:</strong> ${esc(topic)}<br>
    <strong>District:</strong> ${esc(district)}<br>
    <strong>Meeting Date:</strong> ${formatDate(meetingDate)}<br>
    <strong>Meeting Type:</strong> ${esc(meetingType)}
  </div>

  <div style="background: #fff3f3; border-left: 4px solid #e53e3e; padding: 8px 12px; margin-bottom: 20px; font-size: 13px; color: #c53030;">
    <strong>Internal notes</strong> – Please read and edit before sending externally
  </div>

  <h2 style="color: #2b6cb0; font-size: 16px; margin: 24px 0 8px 0; border: none;">Summary</h2>
  <div style="font-size: 14px; margin-bottom: 16px;">${summary.trim() ? nl2br(summary) : "<em style='color:#999;'>—</em>"}</div>

  <h2 style="color: #2b6cb0; font-size: 16px; margin: 24px 0 8px 0; border: none;">Action Items</h2>`;

    if (actions.some((a) => a.nextSteps.trim())) {
      html += `<table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 16px;">
    <thead>
      <tr style="background: #f7fafc;">
        <th style="text-align: left; padding: 6px 10px; border-bottom: 2px solid #e2e8f0;">#</th>
        <th style="text-align: left; padding: 6px 10px; border-bottom: 2px solid #e2e8f0;">Next Steps</th>
        <th style="text-align: left; padding: 6px 10px; border-bottom: 2px solid #e2e8f0;">Owner</th>
        <th style="text-align: left; padding: 6px 10px; border-bottom: 2px solid #e2e8f0;">Due Date</th>
      </tr>
    </thead>
    <tbody>`;
      actions.forEach((act, i) => {
        html += `
      <tr>
        <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0;">${i + 1}</td>
        <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0;">${esc(act.nextSteps)}</td>
        <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0;">${esc(act.owner)}</td>
        <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0;">${act.dueDate ? formatDate(act.dueDate) : ""}</td>
      </tr>`;
      });
      html += `
    </tbody>
  </table>`;
    } else {
      html += `<div style="font-size: 14px; margin-bottom: 16px; color: #999;"><em>—</em></div>`;
    }

    html += `
  <h2 style="color: #2b6cb0; font-size: 16px; margin: 24px 0 8px 0; border: none;">Opportunities Identified</h2>`;

    opps.forEach((opp, i) => {
      html += `
  <div style="margin-bottom: 12px; font-size: 14px;">
    <strong>Opp ${i + 1} – ${esc(opp.name)}</strong><br>
    <span style="color: #555;">B:</span> ${esc(opp.b)}<br>
    <span style="color: #555;">A:</span> ${esc(opp.a)}<br>
    <span style="color: #555;">N:</span> ${esc(opp.n)}<br>
    <span style="color: #555;">T:</span> ${esc(opp.t)}<br>
    <span style="color: #555;">C:</span> ${esc(opp.c)}
  </div>`;
    });

    html += `
  <h2 style="color: #2b6cb0; font-size: 16px; margin: 24px 0 8px 0; border: none;">Attendees</h2>`;

    const attendeeSections = [];
    if (showShi && shiAttendees.trim()) attendeeSections.push({ label: "SHI", text: shiAttendees });
    if (showCustomer && customerAttendees.trim()) attendeeSections.push({ label: "Customer", text: customerAttendees });
    if (showPartner && partnerAttendees.trim()) attendeeSections.push({ label: "Partner", text: partnerAttendees });

    if (attendeeSections.length > 0) {
      attendeeSections.forEach((s) => {
        html += `
  <div style="font-size: 14px; margin-bottom: 8px;">
    <strong>${esc(s.label)}:</strong><br>${nl2br(s.text)}
  </div>`;
      });
    } else {
      html += `<div style="font-size: 14px; margin-bottom: 16px; color: #999;"><em>—</em></div>`;
    }

    html += `

  <h2 style="color: #2b6cb0; font-size: 16px; margin: 24px 0 8px 0; border: none;">Tech Profile Updates</h2>
  <div style="font-size: 14px; margin-bottom: 16px;">${techProfile.trim() ? nl2br(techProfile) : "<em style='color:#999;'>—</em>"}</div>

  <h2 style="color: #2b6cb0; font-size: 16px; margin: 24px 0 8px 0; border: none;">Meeting Notes</h2>
  <div style="font-size: 14px; margin-bottom: 16px;">${meetingNotes.trim() ? nl2br(meetingNotes) : "<em style='color:#999;'>—</em>"}</div>

</div>`;

    return html;
  };

  // ======== PLAIN TEXT COMPILER (for DB storage) ========
  const compileText = () => {
    const lines = [];
    lines.push("TRIP REPORT");
    lines.push(`${formatDate(meetingDate)}`);
    lines.push("");
    if (crmLink) lines.push(`CRM: ${crmLink}`);
    lines.push(meetingFormat);
    lines.push(`Customer: ${customer}`);
    lines.push(`AE: ${ae}`);
    lines.push(`Topic: ${topic}`);
    lines.push(`District: ${district}`);
    lines.push(`Meeting Date: ${formatDate(meetingDate)}`);
    lines.push(`Meeting Type: ${meetingType}`);
    lines.push("");
    lines.push("--- Summary ---");
    lines.push(summary || "—");
    lines.push("");
    lines.push("--- Action Items ---");
    actions.forEach((act, i) => {
      lines.push(`${i + 1}. ${act.nextSteps} | Owner: ${act.owner} | Due: ${act.dueDate ? formatDate(act.dueDate) : "—"}`);
    });
    lines.push("");
    lines.push("--- Opportunities Identified ---");
    opps.forEach((opp, i) => {
      lines.push(`Opp ${i + 1} – ${opp.name}`);
      lines.push(`  B: ${opp.b}`);
      lines.push(`  A: ${opp.a}`);
      lines.push(`  N: ${opp.n}`);
      lines.push(`  T: ${opp.t}`);
      lines.push(`  C: ${opp.c}`);
    });
    lines.push("");
    lines.push("--- Attendees ---");
    if (showShi && shiAttendees.trim()) { lines.push("SHI:"); lines.push(shiAttendees); }
    if (showCustomer && customerAttendees.trim()) { lines.push("Customer:"); lines.push(customerAttendees); }
    if (showPartner && partnerAttendees.trim()) { lines.push("Partner:"); lines.push(partnerAttendees); }
    if (!((showShi && shiAttendees.trim()) || (showCustomer && customerAttendees.trim()) || (showPartner && partnerAttendees.trim()))) lines.push("—");
    lines.push("");
    lines.push("--- Tech Profile Updates ---");
    lines.push(techProfile || "—");
    lines.push("");
    lines.push("--- Meeting Notes ---");
    lines.push(meetingNotes || "—");
    return lines.join("\n");
  };

  // ---- Generate ----
  const handleGenerate = () => {
    setGeneratedHtml(compileHtml());
    setGeneratedText(compileText());
    setSaved(false);
    setCopied(false);
  };

  // ---- Copy as rich HTML (pastes formatted into Outlook/Gmail) ----
  const handleCopy = async () => {
    try {
      // Try the modern Clipboard API first (requires HTTPS or localhost)
      if (navigator.clipboard && window.ClipboardItem && window.isSecureContext) {
        const blob = new Blob([generatedHtml], { type: "text/html" });
        const textBlob = new Blob([generatedText], { type: "text/plain" });
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": blob,
            "text/plain": textBlob,
          }),
        ]);
      } else {
        // Fallback: use execCommand to copy rich HTML (works over HTTP)
        const temp = document.createElement("div");
        temp.innerHTML = generatedHtml;
        temp.style.position = "fixed";
        temp.style.left = "-9999px";
        document.body.appendChild(temp);

        const range = document.createRange();
        range.selectNodeContents(temp);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        document.execCommand("copy");
        sel.removeAllRanges();
        document.body.removeChild(temp);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Last resort: plain text
      const textarea = document.createElement("textarea");
      textarea.value = generatedText;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ---- Save to DB ----
  const handleSave = async () => {
    if (!generatedText) return;
    if (!meetingDate) {
      alert("Meeting Date is required before saving.");
      return;
    }
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
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.detail || `Save failed (${res.status})`);
      }
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
          <label>
            Meeting Format
            <select value={meetingFormat} onChange={(e) => setMeetingFormat(e.target.value)}>
              {MEETING_FORMATS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>
          <label>
            CRM Link
            <input
              value={crmLink}
              onChange={(e) => setCrmLink(e.target.value)}
              placeholder="https://crm.example.com/..."
            />
          </label>
        </div>
      </section>

      {/* ---- SUMMARY ---- */}
      <section className="form-section">
        <h2>Summary</h2>
        <textarea
          className="text-area-field"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="High-level summary of the meeting..."
          rows={4}
        />
      </section>

      {/* ---- ACTION ITEMS (moved before Opps to match template) ---- */}
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

      {/* ---- OPPORTUNITIES ---- */}
      <section className="form-section">
        <div className="section-header">
          <h2>Opportunities Identified</h2>
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

      {/* ---- ATTENDEES ---- */}
      <section className="form-section">
        <h2>Attendees</h2>
        <div className="attendee-toggles">
          <label className="toggle-label">
            <input type="checkbox" checked={showShi} onChange={(e) => setShowShi(e.target.checked)} />
            <span className="toggle-switch" />
            SHI
          </label>
          <label className="toggle-label">
            <input type="checkbox" checked={showCustomer} onChange={(e) => setShowCustomer(e.target.checked)} />
            <span className="toggle-switch" />
            Customer
          </label>
          <label className="toggle-label">
            <input type="checkbox" checked={showPartner} onChange={(e) => setShowPartner(e.target.checked)} />
            <span className="toggle-switch" />
            Partner
          </label>
        </div>
        {showShi && (
          <div className="attendee-group">
            <label className="attendee-group-label">SHI Attendees</label>
            <textarea
              className="text-area-field"
              value={shiAttendees}
              onChange={(e) => setShiAttendees(e.target.value)}
              placeholder="List SHI attendees (one per line)..."
              rows={3}
            />
          </div>
        )}
        {showCustomer && (
          <div className="attendee-group">
            <label className="attendee-group-label">Customer Attendees</label>
            <textarea
              className="text-area-field"
              value={customerAttendees}
              onChange={(e) => setCustomerAttendees(e.target.value)}
              placeholder="List customer attendees (one per line)..."
              rows={3}
            />
          </div>
        )}
        {showPartner && (
          <div className="attendee-group">
            <label className="attendee-group-label">Partner Attendees</label>
            <textarea
              className="text-area-field"
              value={partnerAttendees}
              onChange={(e) => setPartnerAttendees(e.target.value)}
              placeholder="List partner attendees (one per line)..."
              rows={3}
            />
          </div>
        )}
      </section>

      {/* ---- TECH PROFILE ---- */}
      <section className="form-section">
        <h2>Tech Profile Updates</h2>
        <textarea
          className="text-area-field"
          value={techProfile}
          onChange={(e) => setTechProfile(e.target.value)}
          placeholder="What does the customer currently have in place? (e.g., firewalls, EDR, SIEM, cloud providers...)"
          rows={4}
        />
      </section>

      {/* ---- MEETING NOTES ---- */}
      <section className="form-section">
        <h2>Meeting Notes</h2>
        <textarea
          className="text-area-field"
          value={meetingNotes}
          onChange={(e) => setMeetingNotes(e.target.value)}
          placeholder="Free-form meeting notes..."
          rows={6}
        />
      </section>

      {/* ---- GENERATE ---- */}
      <section className="form-section generate-section">
        <button className="btn-generate" onClick={handleGenerate}>
          Generate Trip Report
        </button>
      </section>

      {/* ---- OUTPUT (HTML preview) ---- */}
      {generatedHtml && (
        <section className="form-section output-section">
          <h2>Final Trip Report</h2>
          <div
            ref={previewRef}
            className="report-preview"
            dangerouslySetInnerHTML={{ __html: generatedHtml }}
          />
          <div className="output-actions">
            <button className="btn-copy" onClick={handleCopy}>
              {copied ? "Copied!" : "Copy for Email"}
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
