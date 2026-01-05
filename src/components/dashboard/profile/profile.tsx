"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Alert from "@/components/dashboard/common/Alert";
import { z, ZodError } from "zod";
import { profileSchema } from "@/lib/validations/profile/profile.schema";

function Profile() {
  const { data: session } = useSession();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [imgUrl, setImgUrl] = useState("");
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(
    null,
  );
  const [previewImgUrl, setPreviewImgUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<"success" | "error" | null>(null);
  const [errors, setErrors] = useState<z.ZodIssue[]>([]);

  const dismissAlert = () => {
    setAlertMessage("");
    setAlertType(null);
  };

  const getErrorMessage = (path: string) => {
    return errors.find((error) => error.path[0] === path)?.message;
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (alertType === "success" && alertMessage) {
      timer = setTimeout(() => {
        dismissAlert();
      }, 3000);
    }
    return () => clearTimeout(timer);
  }, [alertType, alertMessage]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!session) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setAlertMessage("");
        setAlertType(null);
        const response = await fetch("/api/profile");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch profile");
        }

        setFirstName(data.firstName || "");
        setLastName(data.lastName || "");
        setEmail(data.email || "");
        setPhoneNumber(data.phoneNumber || "");
        setImgUrl(
          data.avatarUrl ||
            "https://dancey-main.s3.ap-southeast-2.amazonaws.com/web-admin/profile/5aab5459786b226d5d70e39a1dfa0e817fee1e4d.jpg",
        );
        setSelectedAvatarFile(null);
        setPreviewImgUrl(null);
      } catch (err: any) {
        console.error("Error fetching profile:", err);
        setAlertMessage(err.message || "Failed to load profile data.");
        setAlertType("error");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [session]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedAvatarFile(null);
      setPreviewImgUrl(null);
      return;
    }

    if (file.size > 1 * 1024 * 1024) {
      setAlertMessage("Image size must be 1MB max.");
      setAlertType("error");
      return;
    }

    setSelectedAvatarFile(file);
    setPreviewImgUrl(URL.createObjectURL(file));
    setAlertMessage("");
    setAlertType(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) {
      setAlertMessage("You must be logged in to update your profile.");
      setAlertType("error");
      return;
    }

    setIsSubmitting(true);
    setAlertMessage("");
    setAlertType(null);
    setErrors([]);

    let finalAvatarUrl = imgUrl;

    try {
      profileSchema.parse({
        firstName,
        lastName,
        phoneNumber,
        avatarUrl: imgUrl,
      });
    } catch (err) {
      if (err instanceof ZodError) {
        setErrors(err.issues);
        setAlertMessage("Please correct the errors in the form.");
        setAlertType("error");
      } else {
        setAlertMessage("An unexpected validation error occurred.");
        setAlertType("error");
      }
      setIsSubmitting(false);
      return;
    }

    try {
      if (selectedAvatarFile) {
        setUploadingAvatar(true);
        const formData = new FormData();
        formData.append("file", selectedAvatarFile);

        const uploadResponse = await fetch("/api/s3-upload/profile", {
          method: "POST",
          body: formData,
        });

        const uploadData = await uploadResponse.json();

        if (!uploadResponse.ok) {
          throw new Error(uploadData.error || "Failed to upload new avatar");
        }
        finalAvatarUrl = uploadData.url;
        setUploadingAvatar(false);
      }

      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName,
          lastName,
          phoneNumber,
          avatarUrl: finalAvatarUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update profile");
      }

      setFirstName(data.firstName || "");
      setLastName(data.lastName || "");
      setEmail(data.email || "");
      setPhoneNumber(data.phoneNumber || "");
      setImgUrl(data.avatarUrl || "");
      setSelectedAvatarFile(null);
      setPreviewImgUrl(null);
      setAlertMessage("Profile updated successfully!");
      setAlertType("success");
    } catch (err: any) {
      console.error("Error updating profile:", err);
      setAlertMessage(err.message || "Failed to update profile.");
      setAlertType("error");
    } finally {
      setIsSubmitting(false);
      setUploadingAvatar(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 bg-white rounded-lg shadow-md">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading profile...</span>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-white rounded-lg max-w-4xl">
      {alertMessage && alertType && (
        <div className="mb-6">
          <Alert
            type={alertType}
            title={alertType === "success" ? "Success" : "Error"}
            message={alertMessage}
            onDismiss={dismissAlert}
          />
        </div>
      )}

      {/* Avatar Section */}
      <div className="flex items-center mb-8">
        <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-200">
          <img
            src={
              previewImgUrl ||
              imgUrl ||
              "https://dancey-main.s3.ap-southeast-2.amazonaws.com/web-admin/profile/5aab5459786b226d5d70e39a1dfa0e817fee1e4d.jpg"
            }
            alt="Avatar"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="ml-6 flex flex-col justify-center">
          <label
            htmlFor="avatar-upload"
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer"
          >
            {uploadingAvatar ? "Uploading..." : "Change avatar"}
            <input
              id="avatar-upload"
              name="avatar-upload"
              type="file"
              className="sr-only"
              accept="image/jpeg,image/png,image/gif"
              onChange={handleAvatarChange}
              disabled={isSubmitting || uploadingAvatar}
            />
          </label>
          <p className="mt-2 text-xs text-gray-500">JPG, GIF or PNG 1MB max</p>
        </div>
      </div>

      {/* Form Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div>
          <label
            htmlFor="first-name"
            className="block text-sm font-medium text-gray-700"
          >
            First name
          </label>
          <input
            type="text"
            name="first-name"
            id="first-name"
            autoComplete="given-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-3 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
          {getErrorMessage("firstName") && (
            <p className="mt-2 text-sm text-red-600">
              {getErrorMessage("firstName")}
            </p>
          )}
        </div>
        <div>
          <label
            htmlFor="last-name"
            className="block text-sm font-medium text-gray-700"
          >
            Last name
          </label>
          <input
            type="text"
            name="last-name"
            id="last-name"
            autoComplete="family-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-3 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
          {getErrorMessage("lastName") && (
            <p className="mt-2 text-sm text-red-600">
              {getErrorMessage("lastName")}
            </p>
          )}
        </div>
      </div>

      <div className="mb-8">
        <label
          htmlFor="email-address"
          className="block text-sm font-medium text-gray-700"
        >
          Email address
        </label>
        <input
          type="email"
          name="email-address"
          id="email-address"
          autoComplete="email"
          value={email}
          disabled
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-3 px-3 bg-gray-50 text-gray-500 cursor-not-allowed sm:text-sm"
        />
      </div>

      {/* Phone Number Field */}
      <div className="mb-8">
        <label
          htmlFor="phone-number"
          className="block text-sm font-medium text-gray-700"
        >
          Phone number
        </label>
        <input
          type="text"
          name="phone-number"
          id="phone-number"
          autoComplete="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-3 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
        {getErrorMessage("phoneNumber") && (
          <p className="mt-2 text-sm text-red-600">
            {getErrorMessage("phoneNumber")}
          </p>
        )}
      </div>

      {/* Save Button */}
      <div>
        <button
          type="submit"
          disabled={isSubmitting || uploadingAvatar}
          className="inline-flex justify-center py-2 px-8 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#0059FF] hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting || uploadingAvatar ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}

export default Profile;
