import { useEffect, useState } from "react";
import { api } from "../../lib/api.js";

export default function AdminAuditLog() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    api.get("/api/data/admin/audit-log")
      .then((r) => setRows(r.data?.rows || r.data || []))
      .catch(() => setRows([]));
  }, []);

  return (
    <section>
      <h1 className="text-xl font-semibold">Audit Log</h1>
      <div className="mt-4 overflow-hidden rounded-lg border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900/70 text-slate-400">
            <tr><th className="px-3 py-2">Time</th><th className="px-3 py-2">Actor</th><th className="px-3 py-2">Action</th><th className="px-3 py-2">Target</th><th className="px-3 py-2">Diff</th></tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r._id || i} className="border-t border-slate-800 odd:bg-slate-900/30">
                <td className="px-3 py-2">{r.createdAt ? new Date(r.createdAt).toLocaleString() : "-"}</td>
                <td className="px-3 py-2">{r.adminId?.email || r.adminEmail || "-"}</td>
                <td className="px-3 py-2">{r.action || "-"}</td>
                <td className="px-3 py-2">{r.targetType || "-"} {r.targetId || ""}</td>
                <td className="px-3 py-2 font-mono text-xs"><pre className="max-w-[380px] overflow-auto whitespace-pre-wrap">{JSON.stringify(r.diff || {}, null, 2)}</pre></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td className="px-3 py-8 text-center text-slate-500" colSpan={5}>No audit rows yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

