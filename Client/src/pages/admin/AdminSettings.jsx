import { useEffect, useState } from "react";
import { api } from "../../lib/api.js";
import { useToast } from "../../context/ToastContext.jsx";

const TABS = ["Profile", "Security", "Admin Codes", "Rate Limits", "Email Templates", "Feature Flags", "Webhook Retry Policy", "Maintenance Mode"];

export default function AdminSettings() {
  const [tab, setTab] = useState(TABS[0]);
  const [codes, setCodes] = useState([]);
  const { showToast } = useToast();
  const [maintenance, setMaintenance] = useState(false);

  const loadCodes = () => api.get("/api/admin/mgmt/codes").then((r) => setCodes(r.data || [])).catch(() => setCodes([]));
  useEffect(() => { loadCodes(); }, []);

  const generateCode = async () => {
    try {
      await api.post("/api/admin/mgmt/codes/generate");
      showToast("Admin code generated", "success");
      loadCodes();
    } catch {
      showToast("Failed to generate", "error");
    }
  };

  return (
    <section>
      <h1 className="text-xl font-semibold">Settings</h1>
      <div className="mt-3 flex flex-wrap gap-2">
        {TABS.map((t) => <button key={t} onClick={() => setTab(t)} className={`rounded px-2 py-1 text-xs ${tab === t ? "bg-blue-600" : "bg-slate-800"}`}>{t}</button>)}
      </div>

      <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/40 p-4">
        {tab === "Profile" && <div className="space-y-3"><p className="text-sm">Update profile metadata and display name.</p><input className="w-full rounded border border-slate-700 bg-[#121722] px-2 py-1.5 text-sm" placeholder="Display name" /></div>}
        {tab === "Security" && <div className="space-y-2"><button className="rounded border border-slate-700 px-2 py-1 text-sm">Change password</button><button className="ml-2 rounded border border-slate-700 px-2 py-1 text-sm">Regenerate TOTP</button><button className="ml-2 rounded border border-red-700 px-2 py-1 text-sm text-red-400">Revoke sessions</button></div>}
        {tab === "Admin Codes" && <div><button onClick={generateCode} className="rounded bg-blue-600 px-3 py-1 text-sm">Generate new</button><div className="mt-3 space-y-2">{codes.map((c) => <div key={c.id || c.code} className="flex items-center justify-between rounded border border-slate-800 px-3 py-2 text-sm"><span className="font-mono">{c.code}</span><span className="text-xs text-slate-400">{c.used ? "used" : "unused"}</span></div>)}</div></div>}
        {tab === "Rate Limits" && <div className="space-y-2 text-sm"><label>Global RPM <input type="range" min={60} max={10000} defaultValue={600} className="ml-2" /></label></div>}
        {tab === "Email Templates" && <div className="text-sm text-slate-300">Preview OTP/login/recovery template variants.</div>}
        {tab === "Feature Flags" && <div className="space-y-2 text-sm"><label className="flex items-center gap-2"><input type="checkbox" defaultChecked /> Wallet linking v2</label><label className="flex items-center gap-2"><input type="checkbox" /> Experimental chain stats</label></div>}
        {tab === "Webhook Retry Policy" && <div className="text-sm">Retries: exponential backoff, max attempts 5, dead-letter enabled.</div>}
        {tab === "Maintenance Mode" && <div><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={maintenance} onChange={(e) => setMaintenance(e.target.checked)} /> Enable maintenance mode</label></div>}
      </div>
    </section>
  );
}
