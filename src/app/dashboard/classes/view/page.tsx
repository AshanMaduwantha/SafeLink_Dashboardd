"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import Review from "@/components/dashboard/classes/create-classes/Review";
import DeleteConfirmationModal from "@/components/dashboard/common/DeleteConfirmationModal";

export default function ViewClassPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const classId = searchParams.get("classId");
  const [classTitle, setClassTitle] = useState<string>("Class");

  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    isLoading: false,
  });

  useEffect(() => {
    const fetchClassTitle = async () => {
      if (!classId) return;
      try {
        // Try primary class endpoint first
        const res = await fetch(`/api/classes/${classId}`);
        if (res.ok) {
          const data = await res.json();
          const name = data?.class?.name || data?.class?.className;
          if (name) {
            setClassTitle(name);
            return;
          }
        }
        // Fallback to draft details
        const draftRes = await fetch(`/api/classes/draft?id=${classId}`);
        if (draftRes.ok) {
          const draft = await draftRes.json();
          const name = draft?.class?.name || draft?.class?.className;
          if (name) setClassTitle(name);
        }
      } catch (_) {
        // keep default title
      }
    };
    fetchClassTitle();
  }, [classId]);

  const handleEdit = () => {
    if (!classId) return;
    router.push(
      `/dashboard/classes/create-classes?classId=${classId}&step=class-details`,
    );
  };

  const handleBack = () => {
    router.push("/dashboard/classes");
  };

  const handleDeleteClick = () => {
    setDeleteModal({ isOpen: true, isLoading: false });
  };

  const handleDeleteConfirm = async () => {
    if (!classId) return;
    try {
      setDeleteModal((p) => ({ ...p, isLoading: true }));
      const response = await fetch(`/api/classes/${classId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete class");
      setDeleteModal({ isOpen: false, isLoading: false });
      router.push("/dashboard/classes");
    } catch (_e) {
      setDeleteModal((p) => ({ ...p, isLoading: false }));
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModal({ isOpen: false, isLoading: false });
  };

  return (
    <div className="p-0 sm:p-0">
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            className="cursor-pointer px-3 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 inline-flex items-center gap-2"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            <span>Back</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleEdit}
              className="cursor-pointer px-3 py-2 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 inline-flex items-center gap-2"
            >
              <PencilIcon className="h-5 w-5" />
              <span>Edit</span>
            </button>
            <button
              onClick={handleDeleteClick}
              className="cursor-pointer px-3 py-2 rounded-md bg-red-500 text-white hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 inline-flex items-center gap-2"
            >
              <TrashIcon className="h-5 w-5" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>

      {/* The Review component renders the full class details UI (without intro on view page) */}
      <div className="p-4 sm:p-6 bg-white rounded-none sm:rounded-lg shadow-none sm:shadow-md">
        <Review hideIntro />
      </div>

      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title={"Delete Class"}
        message={`Are you sure you want to delete "${classTitle}"? This action cannot be undone and will also delete all associated media files.`}
        confirmButtonText={"Delete"}
        cancelButtonText={"Cancel"}
        isLoading={deleteModal.isLoading}
        loadingText={"Removing..."}
      />
    </div>
  );
}
