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
};

export default function UsersManager({ users, canChangeRole }: { users: Person[]; canChangeRole: boolean }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");

  async function update(id: string, patch: { role?: string; is_active?: boolean }) {
    if (busyId) return;
    setBusyId(id);
    setMessage("");
    try {
      const response = await fetch("/api/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Perubahan gagal disimpan.");
      setMessage("Perubahan akun berhasil disimpan.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Terjadi kesalahan.");
    } finally {
      setBusyId("");
    }
  }

  return <>
    {message && <p className="alert" role="status">{message}</p>}
    <div className="tablewrap">
      <table>
        <thead><tr><th>Nama</th><th>Email</th><th>Role</th><th>Status</th><th>Aksi</th></tr></thead>
        <tbody>
          {users.map((person) => (
            <tr key={person.id}>
              <td><strong>{person.full_name || "-"}</strong></td>
              <td>{person.email || "-"}</td>
              <td>
                {canChangeRole && person.role !== "super_admin" ? (
                  <select aria-label={"Role " + person.full_name} value={person.role}
                    disabled={busyId === person.id}
                    onChange={(event) => update(person.id, { role: event.target.value })}>
                    <option value="sales">Sales</option>
                    <option value="supervisor">Supervisor</option>
                  </select>
                ) : <span className="badge">{person.role === "super_admin" ? "SUPER ADMIN" : person.role.toUpperCase()}</span>}
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
          {!users.length && <tr><td colSpan={5}>Belum ada pengguna terdaftar.</td></tr>}
        </tbody>
      </table>
    </div>
  </>;
}
