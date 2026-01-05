"use client";

import { useState, useEffect } from "react";
import { PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import { Membership } from "@/types/membership";
import AddMembershipModal from "./AddMembershipModal";
import DeleteConfirmationModal from "../common/DeleteConfirmationModal";
import Tooltip from "../common/Tooltip";

interface CreateMembershipData {
  name: string;
  pricePerMonth: string;
  enableMembership: boolean;
}

interface MembershipTableProps {
  onEdit?: (membership: Membership) => void;
  onDelete?: (membershipId: string) => void;
  onToggleStatus?: (membershipId: string, enabled: boolean) => void;
  onCreate?: (data: CreateMembershipData) => void;
}

export default function MembershipTable({
  onEdit,
  onDelete,
  onToggleStatus,
  onCreate,
}: MembershipTableProps) {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingMembership, setEditingMembership] = useState<Membership | null>(
    null,
  );
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [membershipToDelete, setMembershipToDelete] =
    useState<Membership | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch memberships from API
  const fetchMemberships = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/memberships");

      if (!response.ok) {
        throw new Error("Failed to fetch memberships");
      }

      const data = await response.json();
      setMemberships(data.memberships);
    } catch (err) {
      console.error("Error fetching memberships:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch memberships",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemberships();
  }, []);

  const handleToggleStatus = async (
    membershipId: string,
    currentEnabled: boolean,
  ) => {
    const newEnabled = !currentEnabled;

    try {
      const response = await fetch(
        `/api/memberships/${membershipId}/toggle-status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ enabled: newEnabled }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to toggle membership status");
      }

      const data = await response.json();

      // Update local state with the response from server
      setMemberships((prev) =>
        prev.map((membership) =>
          membership.id === membershipId ? data.membership : membership,
        ),
      );

      onToggleStatus?.(membershipId, newEnabled);
    } catch (err) {
      console.error("Error toggling membership status:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to toggle membership status",
      );
    }
  };

  const handleDelete = (membership: Membership) => {
    setMembershipToDelete(membership);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!membershipToDelete) return;

    try {
      setIsDeleting(true);
      const response = await fetch(
        `/api/memberships/${membershipToDelete.id}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to delete membership");
      }

      setMemberships((prev) =>
        prev.filter((m) => m.id !== membershipToDelete.id),
      );
      onDelete?.(membershipToDelete.id);

      // Close modal and reset state
      setIsDeleteModalOpen(false);
      setMembershipToDelete(null);
    } catch (err) {
      console.error("Error deleting membership:", err);
      setError(
        err instanceof Error ? err.message : "Failed to delete membership",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setIsDeleteModalOpen(false);
    setMembershipToDelete(null);
  };

  const handleEdit = (membership: Membership) => {
    setEditingMembership(membership);
    setIsEditMode(true);
    setIsModalOpen(true);
    onEdit?.(membership);
  };

  const handleCreateMembership = (membership: any) => {
    if (isEditMode && editingMembership) {
      // Update existing membership
      setMemberships((prev) =>
        prev.map((m) => (m.id === editingMembership.id ? membership : m)),
      );
    } else {
      // Add new membership
      setMemberships((prev) => [membership, ...prev]);
    }

    // Convert Membership to CreateMembershipData for the callback
    const createData: CreateMembershipData = {
      name: membership.name,
      pricePerMonth: membership.pricePerMonth,
      enableMembership: membership.isPromotionEnabled || false,
    };
    onCreate?.(createData);
  };

  const handleOpenCreateModal = () => {
    setEditingMembership(null);
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingMembership(null);
    setIsEditMode(false);
    setIsModalOpen(false);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Table Header */}
      <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">
            Membership Management
          </h2>
          <button
            onClick={handleOpenCreateModal}
            className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-normal transition-colors duration-200 flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <span className="text-xl">+</span>
            <span className="text-sm sm:text-base">Add Membership</span>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-4 sm:px-6 py-4 bg-red-50 border-b border-red-200">
          <div className="text-red-800 text-sm">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 text-red-600 hover:text-red-800 underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="px-4 sm:px-6 py-12 text-center">
          <div className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
            <div className="text-gray-500 text-base sm:text-lg">
              Loading memberships...
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {!loading && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">
                  <span className="hidden sm:inline">MEMBERSHIP NAME</span>
                  <span className="sm:hidden">NAME</span>
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">
                  <span className="hidden sm:inline">PRICE PER MONTH</span>
                  <span className="sm:hidden">PRICE</span>
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">
                  STATUS
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">
                  <span className="hidden sm:inline">ENABLE</span>
                  <span className="sm:hidden">ON/OFF</span>
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">
                  ACTION
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {memberships.map((membership) => (
                <tr key={membership.id} className="hover:bg-gray-50">
                  <td className="px-3 sm:px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 truncate max-w-[120px] sm:max-w-none">
                      {membership.name}
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {membership.pricePerMonth}
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-md ${
                        membership.status === "Active"
                          ? "bg-[#00A63E] text-white"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {membership.status}
                    </span>
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() =>
                        handleToggleStatus(membership.id, membership.enabled)
                      }
                      className={`cursor-pointer relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                        membership.enabled ? "bg-black" : "bg-gray-200"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                          membership.enabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-1 sm:space-x-2">
                      <Tooltip content="Edit membership">
                        <button
                          onClick={() => handleEdit(membership)}
                          className="cursor-pointer p-1.5 sm:p-2 rounded-md bg-gray-200 text-gray-600 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 min-w-[36px] sm:min-w-[40px] min-h-[36px] sm:min-h-[40px] flex items-center justify-center"
                        >
                          <PencilIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                        </button>
                      </Tooltip>
                      <div className="relative inline-flex">
                        <Tooltip content="Delete membership">
                          <button
                            onClick={() => handleDelete(membership)}
                            className="cursor-pointer p-1.5 sm:p-2 rounded-md bg-red-500 text-white hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 min-w-[36px] sm:min-w-[40px] min-h-[36px] sm:min-h-[40px] flex items-center justify-center"
                          >
                            <TrashIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                          </button>
                        </Tooltip>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state */}
      {!loading && memberships.length === 0 && (
        <div className="text-center py-12 px-4 sm:px-6">
          <div className="text-gray-500 text-base sm:text-lg">
            No memberships found
          </div>
          <div className="text-gray-400 text-sm mt-1">
            Click &quot;Add Membership&quot; to create your first membership
            plan
          </div>
        </div>
      )}

      {/* Add Membership Modal */}
      <AddMembershipModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleCreateMembership}
        editMembership={editingMembership}
        isEditMode={isEditMode}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Delete Membership"
        message={`Are you sure you want to delete "${membershipToDelete?.name}"? This action cannot be undone and will permanently remove the membership from the system.`}
        confirmButtonText="Delete"
        cancelButtonText="Cancel"
        isLoading={isDeleting}
      />
    </div>
  );
}
