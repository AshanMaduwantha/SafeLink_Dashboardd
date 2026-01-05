"use client";

import {
  EnvelopeIcon,
  PhoneIcon,
  CalendarIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import { User } from "@/types/user";
import { useState, useEffect } from "react";
import Tooltip from "../common/Tooltip";
import Alert from "../common/Alert";

interface UserTableProps {
  users: User[];
  loading: boolean;
}

export default function UserTable({ users, loading }: UserTableProps) {
  const [alert, setAlert] = useState<{
    type: "success" | "error";
    title: string;
    message: string;
  } | null>(null);
  const [localUsers, setLocalUsers] = useState<User[]>(users);
  const [togglingStatusId, setTogglingStatusId] = useState<string | null>(null);

  useEffect(() => {
    setLocalUsers(users);
  }, [users]);

  const getFirstLetter = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  const handleToggleStatus = async (uid: string, currentStatus: string) => {
    setTogglingStatusId(uid);
    try {
      const newStatus = currentStatus === "active" ? "inactive" : "active";
      const res = await fetch(`/api/app-users/${uid}/toggle-status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        throw new Error("Failed to toggle user status");
      }

      setLocalUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.uid === uid ? { ...user, status: newStatus } : user,
        ),
      );

      setAlert({
        type: "success",
        title: "Success",
        message: `User status updated to ${newStatus}.`,
      });

      setTimeout(() => {
        setAlert(null);
      }, 3000);
    } catch (error) {
      console.error("Error toggling user status:", error);
      setAlert({
        type: "error",
        title: "Error",
        message: "Failed to update user status.",
      });
    } finally {
      setTogglingStatusId(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-12 text-center">
          <div className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
            <div className="text-gray-500 text-lg">Loading users...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {alert && (
        <div className="mb-4">
          <Alert
            type={alert.type}
            title={alert.title}
            message={alert.message}
            onDismiss={() => setAlert(null)}
          />
        </div>
      )}
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                NAME
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                CONTACT
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                Provider
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                STATUS
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                CREATED AT
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {localUsers.map((user) => (
              <tr key={user.uid} className="hover:bg-gray-50">
                {/* NAME Column */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-sm font-medium text-white">
                          {getFirstLetter(user.name)}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {user.name}
                      </div>
                    </div>
                  </div>
                </td>

                {/* CONTACT Column */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="space-y-1">
                    <div className="flex items-center text-sm text-gray-900">
                      <EnvelopeIcon className="h-4 w-4 text-gray-400 mr-2" />
                      {user.email}
                    </div>
                    <div className="flex items-center text-sm text-gray-900">
                      <PhoneIcon className="h-4 w-4 text-gray-400 mr-2" />
                      {user.phone}
                    </div>
                  </div>
                </td>
                {/* provider Column */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.provider === "google"
                        ? "bg-green-100 text-green-800"
                        : user.provider === "apple"
                          ? "bg-black text-white"
                          : user.provider === "email/password"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {(user.provider || "N/A").toUpperCase()}
                  </span>
                </td>

                {/* STATUS Column */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.status === "active"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {(user.status || "Active").toUpperCase()}
                  </span>
                </td>

                {/* CREATED AT Column */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-gray-900">
                    <CalendarIcon className="h-4 w-4 text-gray-400 mr-2" />
                    {user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })
                      : "N/A"}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                  <div className="flex items-center space-x-2">
                    <Tooltip
                      content={user.status === "active" ? "Disable" : "Enable"}
                    >
                      <button
                        onClick={() =>
                          handleToggleStatus(
                            user.uid,
                            user.status || "inactive",
                          )
                        }
                        className={`p-2 rounded-md ${
                          user.status === "active"
                            ? "bg-green-500 text-white hover:bg-green-600"
                            : "bg-red-500 text-white hover:bg-red-600"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                        disabled={togglingStatusId === user.uid}
                      >
                        {togglingStatusId === user.uid ? (
                          <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <LockClosedIcon className="h-5 w-5" />
                        )}
                      </button>
                    </Tooltip>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty state */}
      {localUsers.length === 0 && (
        <div className="text-center py-12 px-6">
          <div className="text-gray-500 text-lg">No users found</div>
          <div className="text-gray-400 text-sm mt-1">
            Try adjusting your search criteria or add a new user
          </div>
        </div>
      )}
    </div>
  );
}
