"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Person = {
  id: string;
  full_name: string;
  email: string | null;
  role: "sales" | "supervisor" | "super_admin";
  is_active: boolean;
  created_at: string;
  supervisor_id?: string | null;
};
type Supervisor = { id: string; full_name: string };
// Supervisor choices are supplied by the server page for Super Admin team assignment.

export default function UsersManager({ users, canChangeRole, supervisors = [] }: {
  users: Person[]; canChangeRole: boolean; supervisors?: Supervisor[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [assignmentTargets, setAssignmentTargets] = useState<Record<string, string>>({});

  async function update(id: string, patch: { role?: string; is_active?: boolean; supervisor_id?: string | null }) {
    if (busyId) return;
    setBusyId(id); setMessage("");
    try {
      const response = await fetch("/api/team", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Perubahan gagal disimpan.");
      setMessage("Perubahan akun berhasil disimpan.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Terjadi kesalahan.");
    } finally { setBusyId(""); }
  }

  return <>
    {message && <p className="alert" role="status">{message}</p>}
    <div className="tablewrap">
      <table>
        <thead><tr><th>Nama</th><th>Email</th><th>Role</th><th>Tim Supervisor</th><th>Status</th><th>Aksi</th></tr></thead>
        <tbody>
          {users.map(person => (
            <tr key={person.id}>
              <td><strong>{person.full_name || "-"}</strong></td>
              <td>{person.email || "-"}</td>
              <td>
                {canChangeRole && person.role !== "super_admin" ? (
                  <select aria-label={"Role " + person.full_name} value={person.role}
                    disabled={busyId === person.id}
                    onChange={event => {
                      if (event.target.value === "sales" && person.role === "supervisor") {
                        setMessage("Pilih Supervisor tujuan di kolom Tim Supervisor sebelum mengubah akun menjadi Sales.");
                        return;
                      }
                      update(person.id, { role: event.target.value });
                    }}>
                    <option value="sales">Sales</option><option value="supervisor">Supervisor</option>
                  </select>
                ) : <span className="badge">{person.role === "super_admin" ? "SUPER ADMIN" : person.role.toUpperCase()}</span>}
              </td>
              <td>
                {person.role === "sales" && canChangeRole ? (
                  <select aria-label={"Tim Supervisor " + person.full_name} value={person.supervisor_id || ""}
                    disabled={busyId === person.id}
                    onChange={event => update(person.id, { supervisor_id: event.target.value || null })}>
                    <option value="">Belum ditentukan</option>
                    {supervisors.map(item => <option key={item.id} value={item.id}>{item.full_name}</option>)}
                  </select>
                ) : person.role === "sales" ? "Tim sendiri" : canChangeRole && person.role === "supervisor" ? (
                  <div className="actions" style={{ marginTop: 0, flexWrap: "wrap" }}>
                    <select aria-label={"Supervisor tujuan " + person.full_name}
                      value={assignmentTargets[person.id] || ""}
                      disabled={busyId === person.id}
                      onChange={event => setAssignmentTargets(current => ({ ...current, [person.id]: event.target.value }))}>
                      <option value="">Pilih Supervisor tujuan</option>
                      {supervisors.filter(item => item.id !== person.id).map(item =>
                        <option key={item.id} value={item.id}>{item.full_name}</option>
                      )}
                    </select>
                    <button type="button" className="btn"
                      disabled={busyId === person.id || !assignmentTargets[person.id]}
                      onClick={() => update(person.id, { role: "sales", supervisor_id: assignmentTargets[person.id] })}>
                      Jadikan Sales
                    </button>
                  </div>
                ) : "-"}
              </td>
              <td><span className={person.is_active ? "badge green" : "badge red"}>{person.is_active ? "Aktif" : "Nonaktif"}</span></td>
              <td>
                {person.role !== "super_admin" && (
                  <button className={person.is_active ? "btn danger" : "btn"} disabled={busyId === person.id}
                    onClick={() => update(person.id, { is_active: !person.is_active })}>
                    {busyId === person.id ? "Menyimpan..." : person.is_active ? "Nonaktifkan" : "Aktifkan"}
                  </button>
                )}
              </td>
            </tr>
          ))}
          {!users.length && <tr><td colSpan={6}>Belum ada pengguna terdaftar.</td></tr>}
        </tbody>
      </table>
    </div>
  </>;
}
