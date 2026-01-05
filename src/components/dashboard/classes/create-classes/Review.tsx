"use client";

import React, { useState, useEffect } from "react";
import { PhotoIcon, VideoCameraIcon } from "@heroicons/react/24/outline";
import { useSearchParams } from "next/navigation";

interface ReviewData {
  className: string;
  description: string;
  instructorName: string;
  thumbnailUrl: string | null;
  overviewVideoUrl: string | null;
  schedule: Array<{
    schedule_id: string;
    name: string;
    startTime: string;
    endTime: string;
    createdAt: string;
    date: string;
  }>;
  classPrice: number | string | null;
  promotion: {
    id: string;
    promotion_name: string;
    discount: number;
    start_date: string;
    end_date: string;
  } | null;
  memberships: Array<{
    id: string;
    name: string;
    pricePerMonth: number;
  }>;
  classPacks: Array<{
    id: string;
    packName: string;
    classCount: number;
    price: number;
  }>;
}

interface ReviewProps {
  hideIntro?: boolean; // when true, hide the Review heading and helper text
}

const Review: React.FC<ReviewProps> = ({ hideIntro = false }) => {
  const searchParams = useSearchParams();
  const classId = searchParams.get("classId");

  const [classData, setClassData] = useState<ReviewData>({
    className: "",
    description: "",
    instructorName: "",
    thumbnailUrl: null,
    overviewVideoUrl: null,
    schedule: [],
    classPrice: null,
    promotion: null,
    memberships: [],
    classPacks: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (classId) {
      fetchAllClassData();
    }
  }, [classId]);

  const fetchAllClassData = async () => {
    if (!classId) return;

    try {
      setLoading(true);
      setError(null);

      const [
        classDetailsResponse,
        mediaResponse,
        scheduleResponse,
        classPricingResponse,
        membershipsResponse,
        classPacksResponse,
      ] = await Promise.all([
        fetch(`/api/classes/draft?id=${classId}`),
        fetch(`/api/classes/${classId}/media`),
        fetch(`/api/classes/${classId}/schedule`),
        fetch(`/api/classes/${classId}`),
        fetch(`/api/classes/${classId}/memberships`),
        fetch(`/api/classes/${classId}/class-packs`),
      ]);

      if (classDetailsResponse.ok) {
        const classDetailsData = await classDetailsResponse.json();
        if (classDetailsData.success && classDetailsData.class) {
          setClassData((prev) => ({
            ...prev,
            className: classDetailsData.class.className,
            description: classDetailsData.class.description,
            instructorName: classDetailsData.class.instructorName,
          }));
        }
      }

      if (mediaResponse.ok) {
        const mediaData = await mediaResponse.json();
        if (mediaData.success && mediaData.class) {
          setClassData((prev) => ({
            ...prev,
            thumbnailUrl: mediaData.class.image,
            overviewVideoUrl: mediaData.class.overviewVideo,
          }));
        }
      }

      if (scheduleResponse.ok) {
        const scheduleData = await scheduleResponse.json();
        setClassData((prev) => ({
          ...prev,
          schedule: scheduleData.schedule || [],
        }));
      }

      if (classPricingResponse.ok) {
        const pricingData = await classPricingResponse.json();
        if (pricingData.class) {
          setClassData((prev) => ({
            ...prev,
            classPrice: pricingData.class.price,
          }));

          if (pricingData.class.promotionId) {
            const promotionResponse = await fetch(
              `/api/promotion/${pricingData.class.promotionId}`,
            );
            if (promotionResponse.ok) {
              const promotionData = await promotionResponse.json();
              if (promotionData.promotion) {
                setClassData((prev) => ({
                  ...prev,
                  promotion: promotionData.promotion,
                }));
              }
            }
          }
        }
      }

      // Process memberships
      if (membershipsResponse.ok) {
        const membershipsData = await membershipsResponse.json();
        if (membershipsData.memberships) {
          const membershipDetails = await Promise.all(
            membershipsData.memberships.map(
              async (membership: { membership_id: string }) => {
                const membershipResponse = await fetch(
                  `/api/memberships/${membership.membership_id}`,
                );
                if (membershipResponse.ok) {
                  const membershipData = await membershipResponse.json();
                  return membershipData.membership;
                }
                return null;
              },
            ),
          );

          setClassData((prev) => ({
            ...prev,
            memberships: membershipDetails.filter(Boolean),
          }));
        }
      }

      // Process class packs
      if (classPacksResponse.ok) {
        const classPacksData = await classPacksResponse.json();
        if (classPacksData.classPacks) {
          const classPackDetails = await Promise.all(
            classPacksData.classPacks.map(
              async (classPack: { class_pack_id: string }) => {
                const classPackResponse = await fetch(
                  `/api/class-packs/${classPack.class_pack_id}`,
                );
                if (classPackResponse.ok) {
                  const classPackData = await classPackResponse.json();
                  return {
                    ...classPackData.classPack,
                    classCount: classPackData.classPack.classes.length,
                  };
                }
                return null;
              },
            ),
          );

          setClassData((prev) => ({
            ...prev,
            classPacks: classPackDetails.filter(Boolean),
          }));
        }
      }
    } catch (err) {
      console.error("Error fetching class data:", err);
      setError("Failed to load class data");
    } finally {
      setLoading(false);
    }
  };

  const thumbnailDisplay = classData.thumbnailUrl
    ? classData.thumbnailUrl.split("/").pop() || "image.png"
    : "No thumbnail uploaded";

  const overviewVideoDisplay = classData.overviewVideoUrl
    ? classData.overviewVideoUrl.split("/").pop() || "video.mp4"
    : "No video uploaded";

  // Format time for display
  const formatTimeForDisplay = (time24: string) => {
    const [hours, minutes] = time24.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Format date for display
  const formatDateForDisplay = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      weekday: "short",
      month: "short",
      day: "numeric",
    };
    return date.toLocaleDateString("en-US", options);
  };

  if (loading) {
    return (
      <div className="w-full p-3 sm:p-6 bg-white rounded-lg">
        {!hideIntro && (
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
              Review
            </h1>
          </div>
        )}
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
          <span className="ml-3 text-gray-600">Loading class data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-3 sm:p-6 bg-white rounded-lg">
        {!hideIntro && (
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
              Review
            </h1>
          </div>
        )}
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-3 sm:p-6 bg-white rounded-lg">
      {/* Header */}
      {!hideIntro && (
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            Review
          </h1>
          <p className="text-gray-600 text-sm">
            Review all your class information before creating
          </p>
        </div>
      )}

      {/* Class Details Section */}
      <div className="mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Class Details
        </h2>
        <div className="border-t border-gray-200 pt-4">
          <div className="space-y-6">
            {/* Class Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Class Name
              </label>
              <input
                type="text"
                value={classData.className || "Not provided"}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={classData.description || "Not provided"}
                readOnly
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900"
              />
            </div>

            {/* Instructor Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Instructor Name
              </label>
              <input
                type="text"
                value={classData.instructorName || "Not provided"}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Thumbnail Section */}
      <div className="mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Thumbnail</h2>
        <div className="border-t border-gray-200 pt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Class Thumbnail
            </label>
            <div className="relative">
              <input
                type="text"
                value={thumbnailDisplay}
                readOnly
                className="w-full px-3 py-3 pl-12 border border-gray-300 rounded-md bg-gray-50 text-gray-900"
              />
              <PhotoIcon
                className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Overview Video Section */}
      <div className="mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Overview Video
        </h2>
        <div className="border-t border-gray-200 pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Overview Video
          </label>
          <div className="relative">
            <input
              type="text"
              value={overviewVideoDisplay}
              readOnly
              className="w-full px-3 py-3 pl-12 border border-gray-300 rounded-md bg-gray-50 text-gray-900"
            />
            <VideoCameraIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Schedule Section */}
      <div className="mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Schedule</h2>
        <div className="border-t border-gray-200 pt-4 divide-y divide-gray-200">
          {classData.schedule.length > 0 ? (
            classData.schedule.map((item) => (
              <div
                key={item.schedule_id}
                className="py-4 flex items-start justify-between"
              >
                <div className="flex items-start gap-4">
                  <p className="text-sm text-gray-500">
                    {formatDateForDisplay(item.date)}
                  </p>
                  <p className="text-sm font-medium text-gray-900">
                    {item.name}
                  </p>
                </div>
                <p className="text-sm text-gray-500">
                  {formatTimeForDisplay(item.startTime)} -{" "}
                  {formatTimeForDisplay(item.endTime)}
                </p>
              </div>
            ))
          ) : (
            <div className="py-4 text-center">
              <p className="text-gray-500">No scheduled classes</p>
            </div>
          )}
        </div>
      </div>

      {/* Pricing Section */}
      <div className="mb-10">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Pricing</h2>
        <div className="border-t border-gray-200 pt-4 space-y-6">
          {/* Fixed Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fixed Price
            </label>
            <input
              type="text"
              value={
                classData.classPrice && !isNaN(Number(classData.classPrice))
                  ? `$${Number(classData.classPrice).toFixed(2)} AUD`
                  : "Not set"
              }
              readOnly
              className="w-full px-3 py-3 border border-gray-300 rounded-md bg-gray-50 text-gray-900"
            />
          </div>

          {/* Promotions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Promotions
            </label>
            {classData.promotion ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="font-semibold text-gray-900">
                  {classData.promotion.promotion_name}
                </p>
                <p className="text-sm text-gray-600">
                  Enjoy {classData.promotion.discount}% discount from{" "}
                  {new Date(
                    classData.promotion.start_date,
                  ).toLocaleDateString()}{" "}
                  to{" "}
                  {new Date(classData.promotion.end_date).toLocaleDateString()}
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-gray-500">No promotion selected</p>
              </div>
            )}
          </div>

          {/* Final Price Display */}
          {classData.classPrice &&
            !isNaN(Number(classData.classPrice)) &&
            classData.promotion && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Final Price
                </label>
                {(() => {
                  const fixedPrice = Number(classData.classPrice);
                  const discount = classData.promotion.discount;
                  const discountAmount = (fixedPrice * discount) / 100;
                  const finalPrice = fixedPrice - discountAmount;

                  return (
                    <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">
                            After {discount}% discount
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-green-700">
                            ${finalPrice.toFixed(2)} AUD
                          </p>
                          <p className="text-xs text-gray-500 line-through">
                            ${fixedPrice.toFixed(2)} AUD
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

          {/* Membership */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Membership Tiers
            </label>
            {classData.memberships.length > 0 ? (
              <div className="space-y-3">
                {classData.memberships.map((membership) => (
                  <div
                    key={membership.id}
                    className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                  >
                    <p className="font-semibold text-gray-900">
                      {membership.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      Enjoy all classes for one fixed monthly fee AUD{" "}
                      {membership.pricePerMonth}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-gray-500">No membership tiers selected</p>
              </div>
            )}
          </div>

          {/* Class Packs */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Class Packs
            </label>
            {classData.classPacks.length > 0 ? (
              <div className="space-y-3">
                {classData.classPacks.map((classPack) => (
                  <div
                    key={classPack.id}
                    className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                  >
                    <p className="font-semibold text-gray-900">
                      {classPack.packName}
                    </p>
                    <p className="text-sm text-gray-600">
                      {classPack.classCount} classes for AUD {classPack.price}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-gray-500">No class packs selected</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions are handled by the parent page using ActionButtons */}
    </div>
  );
};

export default Review;
