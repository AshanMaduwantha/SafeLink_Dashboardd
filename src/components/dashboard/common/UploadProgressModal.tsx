"use client";

import React from "react";

interface UploadProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  progress: number;
  isUploading: boolean;
  uploadMessage: string;
  error: string | null;
  fileNames: string[];
}

const UploadProgressModal: React.FC<UploadProgressModalProps> = ({
  isOpen,
  onClose,
  progress,
  isUploading,
  uploadMessage,
  error,
  fileNames,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Uploading Files</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isUploading}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {uploadMessage && (
            <p className="text-sm text-gray-600">{uploadMessage}</p>
          )}

          {fileNames.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Files:</p>
              {fileNames.map((fileName, index) => (
                <p key={index} className="text-sm text-gray-600">
                  • {fileName}
                </p>
              ))}
            </div>
          )}

          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          <p className="text-sm text-gray-500 text-center">
            {progress}% complete
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">Error: {error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadProgressModal;
