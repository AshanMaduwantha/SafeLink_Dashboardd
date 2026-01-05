"use client";

import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import { Promotion } from "@/types/promotion";
import { Membership } from "@/types/membership";
import { ClassPack } from "@/types/classPacks";
import {
  PricingSchema,
  PricingFormData,
} from "@/lib/validations/classes/create-classes/Pricing.schema";

export interface PricingFormRef {
  saveToDatabase: () => Promise<boolean>;
}

interface PricingProps {
  onLoadingChange?: (loading: boolean) => void;
}

const Pricing = forwardRef<PricingFormRef, PricingProps>(
  ({ onLoadingChange }, ref) => {
    const searchParams = useSearchParams();
    const classId = searchParams.get("classId");

    const {
      control,
      setValue,
      getValues,
      trigger,
      watch,
      formState: { errors },
    } = useForm<PricingFormData>({
      resolver: zodResolver(PricingSchema),
      defaultValues: {
        classPrice: undefined,
        promotionId: "",
        membershipIds: [],
        classPackIds: [],
      },
    });

    const [promotionSearch, setPromotionSearch] = useState("");
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [filteredPromotions, setFilteredPromotions] = useState<Promotion[]>(
      [],
    );
    const [loadingPromotions, setLoadingPromotions] = useState(true);
    const [errorPromotions, setErrorPromotions] = useState<string | null>(null);
    const [selectedPromotion, setSelectedPromotion] =
      useState<Promotion | null>(null);
    const [displayPrice, setDisplayPrice] = useState("");
    const [memberships, setMemberships] = useState<Membership[]>([]);
    const [loadingMemberships, setLoadingMemberships] = useState(true);
    const [errorMemberships, setErrorMemberships] = useState<string | null>(
      null,
    );

    const [classPackSearch, setClassPackSearch] = useState("");
    const [classPacks, setClassPacks] = useState<ClassPack[]>([]);
    const [filteredClassPacks, setFilteredClassPacks] = useState<ClassPack[]>(
      [],
    );
    const [loadingClassPacks, setLoadingClassPacks] = useState(true);
    const [errorClassPacks, setErrorClassPacks] = useState<string | null>(null);
    const [finalPrice, setFinalPrice] = useState<number | null>(null);

    // Fetch Promotions
    useEffect(() => {
      const fetchPromotions = async () => {
        try {
          onLoadingChange?.(true);
          const response = await fetch("/api/promotion");
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const responseData = await response.json();

          // Handle the correct API response structure
          const promotions = responseData.promotions || [];
          if (!Array.isArray(promotions)) {
            throw new Error(
              "Invalid response format: promotions is not an array",
            );
          }

          const enabledPromotions = promotions.filter((promo) => {
            const endDate = new Date(promo.end_date);
            const currentDate = new Date();
            return (
              promo.is_enabled &&
              promo.status === "Active" &&
              endDate >= currentDate
            );
          });
          setPromotions(enabledPromotions);
        } catch (error) {
          console.error("Error fetching promotions:", error);
          setErrorPromotions("Failed to load promotions.");
        } finally {
          setLoadingPromotions(false);
          onLoadingChange?.(false);
        }
      };
      fetchPromotions();
    }, []);

    // Fetch Memberships
    useEffect(() => {
      const fetchMemberships = async () => {
        try {
          onLoadingChange?.(true);
          const response = await fetch("/api/memberships");
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const responseData: { memberships: Membership[] } =
            await response.json();
          setMemberships(
            responseData.memberships.filter((m) => m.isMembershipEnabled),
          );
        } catch (error) {
          console.error("Error fetching memberships:", error);
          setErrorMemberships("Failed to load memberships.");
        } finally {
          setLoadingMemberships(false);
          onLoadingChange?.(false);
        }
      };
      fetchMemberships();
    }, []);

    // Fetch Class Packs
    useEffect(() => {
      const fetchClassPacks = async () => {
        try {
          onLoadingChange?.(true);
          const response = await fetch("/api/class-packs");
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const responseData = await response.json();
          const classPacks = responseData.classPacks || [];
          if (!Array.isArray(classPacks)) {
            throw new Error(
              "Invalid response format: classPacks is not an array",
            );
          }
          setClassPacks(classPacks.filter((cp) => cp.isActive));
        } catch (error) {
          console.error("Error fetching class packs:", error);
          setErrorClassPacks("Failed to load class packs.");
        } finally {
          setLoadingClassPacks(false);
          onLoadingChange?.(false);
        }
      };
      fetchClassPacks();
    }, []);

    useEffect(() => {
      const fetchClassPricing = async () => {
        if (!classId || promotions.length === 0 || classPacks.length === 0) {
          return;
        }

        try {
          const response = await fetch(`/api/classes/${classId}`);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          const classData = data.class;

          if (
            classData.price !== undefined &&
            classData.price !== null &&
            classData.price !== 0
          ) {
            const price = parseFloat(classData.price);
            setValue("classPrice", price);
            setDisplayPrice(price.toFixed(2));
          }
          if (classData.promotionId && classData.promotionId.trim() !== "") {
            const promo = promotions.find(
              (p) => p.id === classData.promotionId,
            );
            if (promo) {
              setSelectedPromotion(promo);
              setValue("promotionId", promo.id);
            } else {
              setSelectedPromotion(null);
              setValue("promotionId", "");
            }
          } else {
            setSelectedPromotion(null);
            setValue("promotionId", "");
          }

          const membershipsResponse = await fetch(
            `/api/classes/${classId}/memberships`,
          );
          if (membershipsResponse.ok) {
            const membershipData = await membershipsResponse.json();
            const selectedMembershipIds = membershipData.memberships.map(
              (m: { membership_id: string }) => m.membership_id,
            );
            setValue("membershipIds", selectedMembershipIds);
          } else {
            setValue("membershipIds", []);
          }

          const classPacksResponse = await fetch(
            `/api/classes/${classId}/class-packs`,
          );
          if (classPacksResponse.ok) {
            const classPackData = await classPacksResponse.json();
            const selectedClassPackIds = classPackData.classPacks.map(
              (cp: { class_pack_id: string }) => cp.class_pack_id,
            );
            setValue("classPackIds", selectedClassPackIds);
          } else {
            setValue("classPackIds", []);
          }
        } catch (error) {
          console.error("Error fetching class pricing:", error);
        }
      };

      if (classId && promotions.length > 0 && classPacks.length > 0) {
        fetchClassPricing();
      }
    }, [classId, setValue, promotions, classPacks]);

    useEffect(() => {
      if (promotionSearch.trim() === "") {
        setFilteredPromotions([]);
        return;
      }
      const lowercasedSearch = promotionSearch.toLowerCase();
      const filtered = promotions.filter((promo) =>
        promo.promotion_name.toLowerCase().includes(lowercasedSearch),
      );
      setFilteredPromotions(filtered);
    }, [promotionSearch, promotions]);

    useEffect(() => {
      if (classPackSearch.trim() === "") {
        setFilteredClassPacks([]);
        return;
      }
      const lowercasedSearch = classPackSearch.toLowerCase();
      const filtered = classPacks.filter((classPack) =>
        classPack.packName.toLowerCase().includes(lowercasedSearch),
      );
      setFilteredClassPacks(filtered);
    }, [classPackSearch, classPacks]);

    // Calculate final price based on fixed price and promotion
    useEffect(() => {
      const classPrice = watch("classPrice");

      if (
        classPrice !== undefined &&
        classPrice !== null &&
        !isNaN(classPrice)
      ) {
        if (selectedPromotion && selectedPromotion.discount > 0) {
          // Calculate discounted price
          const discountAmount =
            (classPrice * selectedPromotion.discount) / 100;
          const calculatedFinalPrice = classPrice - discountAmount;
          setFinalPrice(calculatedFinalPrice);
        } else {
          // No promotion, final price equals fixed price
          setFinalPrice(classPrice);
        }
      } else {
        setFinalPrice(null);
      }
    }, [watch("classPrice"), selectedPromotion, watch]);

    const handlePromotionSelect = (promo: Promotion) => {
      setSelectedPromotion(promo);
      setValue("promotionId", promo.id);
      setPromotionSearch("");
      setFilteredPromotions([]);
      if (errors.promotionId) {
        trigger("promotionId");
      }
    };

    const handlePromotionDeselect = () => {
      setSelectedPromotion(null);
      setValue("promotionId", "");
      // Clear any validation errors when deselecting
      if (errors.promotionId) {
        trigger("promotionId");
      }
    };

    const selectedMembershipIds = watch("membershipIds");
    const selectedClassPackIds = watch("classPackIds");

    const handleMembershipToggle = (membershipId: string) => {
      const currentSelected = selectedMembershipIds || [];
      const newSelected = currentSelected.includes(membershipId)
        ? currentSelected.filter((id) => id !== membershipId)
        : [...currentSelected, membershipId];
      setValue("membershipIds", newSelected);
      if (errors.membershipIds) {
        trigger("membershipIds");
      }
    };

    const handleClassPackToggle = (classPackId: string) => {
      const currentSelected = selectedClassPackIds || [];
      const newSelected = currentSelected.includes(classPackId)
        ? currentSelected.filter((id) => id !== classPackId)
        : [...currentSelected, classPackId];
      setValue("classPackIds", newSelected);
      if (errors.classPackIds) {
        trigger("classPackIds");
      }
    };

    useImperativeHandle(ref, () => ({
      saveToDatabase: async () => {
        const isValid = await trigger();
        if (isValid) {
          const formData = getValues();
          const requestData = {
            classPrice: formData.classPrice,
            promotionId: formData.promotionId || null,
            membershipIds: formData.membershipIds,
            classPackIds: formData.classPackIds || [],
          };

          try {
            const response = await fetch(`/api/classes/${classId}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(requestData),
            });

            if (!response.ok) {
              const errorData = await response.json();
              console.error("Failed to save pricing data:", errorData);
              alert(
                `Failed to save pricing data: ${errorData.message || errorData.error}`,
              );
              return false;
            }
            return true;
          } catch (error) {
            console.error("Error saving pricing data:", error);
            alert("An unexpected error occurred while saving pricing data.");
            return false;
          }
        }
        return false;
      },
    }));

    return (
      <div className="w-full p-3 sm:p-6 bg-white rounded-lg">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            Pricing
          </h1>
          <p className="text-gray-600 text-sm">Class Pricing information</p>
        </div>

        {/* Fixed Price Section */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fixed Price <span className="text-red-500">*</span>
          </label>
          <Controller
            name="classPrice"
            control={control}
            render={({ field }) => {
              const handlePriceChange = (
                e: React.ChangeEvent<HTMLInputElement>,
              ) => {
                const value = e.target.value;
                // Allow only numbers and a single decimal point with up to two decimal places
                if (/^\d*\.?\d{0,2}$/.test(value)) {
                  setDisplayPrice(value);
                  const numericValue = parseFloat(value);
                  field.onChange(
                    isNaN(numericValue) ? undefined : numericValue,
                  );
                  if (errors.classPrice) {
                    trigger("classPrice");
                  }
                }
              };

              const handlePriceBlur = () => {
                const value = getValues("classPrice");
                if (value !== undefined && value !== null && !isNaN(value)) {
                  const formattedValue = value.toFixed(2);
                  setValue("classPrice", parseFloat(formattedValue));
                  setDisplayPrice(formattedValue);
                } else {
                  // If the value is invalid or empty, clear the display price
                  setDisplayPrice("");
                  setValue("classPrice", undefined);
                }
                trigger("classPrice");
              };

              return (
                <input
                  type="text"
                  inputMode="decimal"
                  value={displayPrice}
                  onChange={handlePriceChange}
                  onBlur={handlePriceBlur}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="$20.00 AUD"
                />
              );
            }}
          />
          {errors.classPrice && (
            <p className="mt-2 text-sm text-red-600">
              {errors.classPrice.message}
            </p>
          )}
        </div>

        {/* Final Price Display */}
        {finalPrice !== null && selectedPromotion && (
          <div className="mb-8 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Final Price
                </label>
                <p className="text-xs text-gray-500">
                  After {selectedPromotion.discount}% discount
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-700">
                  ${finalPrice.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 line-through">
                  ${watch("classPrice")?.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Promotions Section */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Promotions
          </label>
          {selectedPromotion ? (
            <div
              className={`
              relative p-4 border-2 rounded-lg cursor-pointer transition-all duration-200
              border-blue-500 bg-blue-50
            `}
              onClick={handlePromotionDeselect}
            >
              <div className="absolute top-2 right-2">
                <div
                  className={`
                  w-6 h-6 rounded-full border-2 flex items-center justify-center
                  border-blue-500 bg-blue-500
                `}
                >
                  <svg
                    className="w-4 h-4 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
              <div className="pr-8">
                <h3 className="font-semibold text-gray-900 mb-1">
                  {selectedPromotion.promotion_name}
                </h3>
                <p className="text-sm text-gray-600">
                  Enjoy {selectedPromotion.discount}% discount from{" "}
                  {new Date(selectedPromotion.start_date).toLocaleDateString()}{" "}
                  to {new Date(selectedPromotion.end_date).toLocaleDateString()}
                </p>
              </div>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                value={promotionSearch}
                onChange={(e) => {
                  setPromotionSearch(e.target.value);
                  // Clear error when user starts typing in search
                  if (errors.promotionId) {
                    trigger("promotionId");
                  }
                }}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Search promotions (optional)"
              />
            </div>
          )}

          {/* Display Search Results */}
          {!selectedPromotion && promotionSearch.trim() !== "" && (
            <>
              {loadingPromotions && (
                <p className="text-gray-600 mt-4">Loading promotions...</p>
              )}
              {errorPromotions && (
                <p className="text-red-500 mt-4">{errorPromotions}</p>
              )}
              {!loadingPromotions &&
                !errorPromotions &&
                filteredPromotions.length === 0 && (
                  <p className="text-gray-600 mt-4">
                    No promotions found for &ldquo;{promotionSearch}&rdquo;.
                  </p>
                )}
              {!loadingPromotions &&
                !errorPromotions &&
                filteredPromotions.length > 0 && (
                  <div className="mt-4 relative">
                    <div className="space-y-2 max-h-[12rem] overflow-y-auto custom-scrollbar">
                      {filteredPromotions.map((promo) => (
                        <div
                          key={promo.id}
                          onClick={() => handlePromotionSelect(promo)}
                          className="w-full bg-white shadow-sm rounded-lg p-3 border border-gray-200 cursor-pointer hover:border-blue-400 transition-colors duration-200 flex items-center justify-between"
                        >
                          <div>
                            <h3 className="font-medium text-gray-900">
                              {promo.promotion_name}
                            </h3>
                            <p className="text-sm text-gray-600">
                              Enjoy {promo.discount}% discount from{" "}
                              {new Date(promo.start_date).toLocaleDateString()}{" "}
                              to {new Date(promo.end_date).toLocaleDateString()}
                            </p>
                          </div>
                          {/* Optional: Add a checkmark or similar indicator if needed, similar to membership tiers */}
                        </div>
                      ))}
                    </div>
                    {/* Scroll indicator */}
                    {filteredPromotions.length > 3 && (
                      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none flex items-end justify-center">
                        <div className="flex items-center space-x-1 mb-2 px-3 py-1 bg-white/90 rounded-full shadow-sm border border-gray-200">
                          <svg
                            className="w-3 h-3 text-gray-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 14l-7 7m0 0l-7-7m7 7V3"
                            />
                          </svg>
                          <span className="text-xs text-gray-500 font-medium">
                            Scroll for more
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
            </>
          )}
          {errors.promotionId && (
            <p className="mt-2 text-sm text-red-600">
              {errors.promotionId.message}
            </p>
          )}
        </div>

        {/* Class Packs Section */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Class Packs
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              value={classPackSearch}
              onChange={(e) => {
                setClassPackSearch(e.target.value);
                if (errors.classPackIds) {
                  trigger("classPackIds");
                }
              }}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Search class packs (optional)"
            />
          </div>

          {/* Display Selected Class Packs */}
          {selectedClassPackIds && selectedClassPackIds.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {selectedClassPackIds.map((classPackId) => {
                const classPack = classPacks.find(
                  (cp) => cp.id === classPackId,
                );
                return (
                  classPack && (
                    <span
                      key={classPack.id}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 cursor-pointer"
                      onClick={() => handleClassPackToggle(classPack.id)}
                    >
                      {classPack.packName}
                      <svg
                        className="ml-2 h-4 w-4 text-blue-600"
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
                    </span>
                  )
                );
              })}
            </div>
          )}

          {/* Display Search Results */}
          {classPackSearch.trim() !== "" && filteredClassPacks.length > 0 && (
            <div className="mt-4 relative">
              <div className="space-y-2 max-h-[12rem] overflow-y-auto custom-scrollbar">
                {filteredClassPacks.map((classPack) => {
                  const isSelected = selectedClassPackIds?.includes(
                    classPack.id,
                  );
                  return (
                    <div
                      key={classPack.id}
                      onClick={() => handleClassPackToggle(classPack.id)}
                      className={`
                        w-full bg-white shadow-sm rounded-lg p-3 border-2 cursor-pointer transition-colors duration-200 flex items-center justify-between
                        ${isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}
                      `}
                    >
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {classPack.packName}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {classPack.classCount} classes for AUD{" "}
                          {classPack.price}
                        </p>
                      </div>
                      <div className="absolute top-2 right-2">
                        <div
                          className={`
                            w-6 h-6 rounded-md border-2 flex items-center justify-center
                            ${isSelected ? "border-blue-500 bg-blue-500" : "border-gray-300"}
                          `}
                        >
                          {isSelected && (
                            <svg
                              className="w-4 h-4 text-white"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {filteredClassPacks.length > 3 && (
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none flex items-end justify-center">
                  <div className="flex items-center space-x-1 mb-2 px-3 py-1 bg-white/90 rounded-full shadow-sm border border-gray-200">
                    <svg
                      className="w-3 h-3 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 14l-7 7m0 0l-7-7m7 7V3"
                      />
                    </svg>
                    <span className="text-xs text-gray-500 font-medium">
                      Scroll for more
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {loadingClassPacks && classPackSearch.trim() !== "" && (
            <p className="text-gray-600 mt-4">Loading class packs...</p>
          )}
          {errorClassPacks && classPackSearch.trim() !== "" && (
            <p className="text-red-500 mt-4">{errorClassPacks}</p>
          )}
          {!loadingClassPacks &&
            !errorClassPacks &&
            classPackSearch.trim() !== "" &&
            filteredClassPacks.length === 0 && (
              <p className="text-gray-600 mt-4">
                No class packs found for &ldquo;{classPackSearch}&rdquo;.
              </p>
            )}
          {errors.classPackIds && (
            <p className="mt-2 text-sm text-red-600">
              {errors.classPackIds.message}
            </p>
          )}
        </div>

        {/* Membership Tier Section */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-4">
            Membership Tier <span className="text-red-500">*</span>
          </label>
          {loadingMemberships && (
            <p className="text-gray-600">Loading memberships...</p>
          )}
          {errorMemberships && (
            <p className="text-red-500">{errorMemberships}</p>
          )}
          {!loadingMemberships &&
            !errorMemberships &&
            memberships.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {memberships.map((membership) => {
                  const isSelected = selectedMembershipIds?.includes(
                    membership.id,
                  );
                  return (
                    <div
                      key={membership.id}
                      onClick={() => handleMembershipToggle(membership.id)}
                      className={`
                    relative p-4 border-2 rounded-lg cursor-pointer transition-all duration-200
                    ${
                      isSelected
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }
                  `}
                    >
                      {/* Checkbox indicator */}
                      <div className="absolute top-2 right-2">
                        <div
                          className={`
                        w-6 h-6 rounded-md border-2 flex items-center justify-center
                        ${
                          isSelected
                            ? "border-blue-500 bg-blue-500"
                            : "border-gray-300"
                        }
                      `}
                        >
                          {isSelected && (
                            <svg
                              className="w-4 h-4 text-white"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </div>
                      </div>

                      <div className="pr-8">
                        <h3 className="font-semibold text-gray-900 mb-2">
                          {membership.name}
                        </h3>
                        <p className="text-sm text-gray-600 mb-3">
                          Enjoy all classes for one fixed monthly fee{" "}
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          AUD {membership.pricePerMonth}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          {!loadingMemberships &&
            !errorMemberships &&
            memberships.length === 0 && (
              <p className="text-gray-600">No memberships available.</p>
            )}
          {errors.membershipIds && (
            <p className="mt-2 text-sm text-red-600">
              {errors.membershipIds.message}
            </p>
          )}
        </div>
      </div>
    );
  },
);

Pricing.displayName = "Pricing";

export default Pricing;
