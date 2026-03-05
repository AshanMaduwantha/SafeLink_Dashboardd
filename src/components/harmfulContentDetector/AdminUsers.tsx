"use client";

import { useEffect, useState } from "react";
import { listUsers } from "@/lib/harmfulContentDetector/api";
import type { User } from "@/lib/harmfulContentDetector/types";

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    listUsers()
      .then(setUsers)
      .catch(() => setError("Only ADMIN can view users"));
  }, []);

  return (
    <div className="hcd-row" style={{ flexDirection: "column" }}>
      <h2>User Management</h2>
      {error && <div style={{ color: "#b91c1c" }}>{error}</div>}
      <div className="hcd-card">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Email</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
