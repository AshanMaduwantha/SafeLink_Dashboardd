"use client";

import React, { useState, useEffect } from "react";
import { PlusIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import { Switch } from "@headlessui/react";
import AddAdminModal from "./AddAdminModal";
import DeleteConfirmationModal from "../common/DeleteConfirmationModal";
import Tooltip from "../common/Tooltip";

import type { Admin } from "@/types/admin";

function AdminManagement() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [adminToEdit, setAdminToEdit] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [adminToDeleteId, setAdminToDeleteId] = useState<string | null>(null);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setAdmins(data.admins);
    } catch (error) {
      console.error("Error fetching admins:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const toggleAdminStatus = async (
    id: string,
    currentStatus: "active" | "inactive",
  ) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    try {
      const response = await fetch(`/api/admin/${id}/toggle-status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setAdmins((prevAdmins) =>
        prevAdmins.map((admin) =>
          admin.id === id ? { ...admin, status: newStatus } : admin,
        ),
      );
    } catch (error) {
      console.error("Error toggling admin status:", error);
    }
  };

  const handleAddAdminClick = () => {
    setAdminToEdit(null);
    setIsAddModalOpen(true);
  };

  const handleEditAdminClick = (admin: Admin) => {
    setAdminToEdit(admin);
    setIsAddModalOpen(true);
  };

  const openDeleteModal = (id: string) => {
    setAdminToDeleteId(id);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setAdminToDeleteId(null);
  };

  const confirmDeleteAdmin = async () => {
    if (!adminToDeleteId) return;

    try {
      const response = await fetch(`/api/admin/${adminToDeleteId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      setAdmins((prevAdmins) =>
        prevAdmins.filter((admin) => admin.id !== adminToDeleteId),
      );
      closeDeleteModal();
    } catch (error) {
      console.error("Error deleting admin:", error);
      closeDeleteModal();
    }
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
    fetchAdmins();
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          Admin Management
        </h1>
        <button
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          onClick={handleAddAdminClick}
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Admin
        </button>
      </div>

      {loading && (
        <div className="px-4 sm:px-6 py-12 text-center">
          <div className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
            <div className="text-gray-500 text-base sm:text-lg">
              Loading admins...
            </div>
          </div>
        </div>
      )}

      {!loading && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  ADMIN
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  CONTACT
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  ROLE
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  LAST LOGIN
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  STATUS
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  ENABLE
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  ACTION
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {admins.map((admin) => {
                return (
                  <tr key={admin.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
                          {admin.name
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {admin.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 flex items-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 mr-1 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                        {admin.email}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center mt-1">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 mr-1 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                          />
                        </svg>
                        {admin.phone_number}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-black text-white">
                        {admin.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 mr-1 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        {admin.last_login
                          ? new Date(admin.last_login).toLocaleString()
                          : "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${admin.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}
                      >
                        {admin.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Switch
                        checked={admin.status === "active"}
                        onChange={() =>
                          toggleAdminStatus(admin.id, admin.status)
                        }
                        className={`${admin.status === "active" ? "bg-blue-600" : "bg-gray-200"}
                      relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                      >
                        <span className="sr-only">Enable admin</span>
                        <span
                          aria-hidden="true"
                          className={`${admin.status === "active" ? "translate-x-5" : "translate-x-0"}
                        pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                        />
                      </Switch>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex space-x-1 sm:space-x-2">
                        <Tooltip content="Edit promotion">
                          <button
                            className="cursor-pointer p-1.5 sm:p-2 rounded-md bg-gray-200 text-gray-600 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 min-w-[36px] sm:min-w-[40px] min-h-[36px] sm:min-h-[40px] flex items-center justify-center"
                            onClick={() => handleEditAdminClick(admin)}
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                        </Tooltip>
                        <div className="relative inline-flex">
                          <Tooltip content="Delete promotion">
                            <button
                              className="cursor-pointer p-1.5 sm:p-2 rounded-md bg-red-500 text-white hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 min-w-[36px] sm:min-w-[40px] min-h-[36px] sm:min-h-[40px] flex items-center justify-center"
                              onClick={() => openDeleteModal(admin.id)}
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </Tooltip>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AddAdminModal
        isOpen={isAddModalOpen}
        onClose={handleCloseAddModal}
        adminToEdit={adminToEdit}
      />

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        onConfirm={confirmDeleteAdmin}
        title="Delete Admin"
        message="Are you sure you want to delete this admin? This action cannot be undone."
      />
    </div>
  );
}

export default AdminManagement;
