"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import ProgressBar from "@/components/dashboard/classes/create-classes/ProgressBar";
import ThumbnailAndOverview, {
  ThumbnailAndOverviewFormRef,
} from "@/components/dashboard/classes/create-classes/ThumbnailAndOverview";
import ClassDetailsForm, {
  ClassDetailsFormRef,
} from "@/components/dashboard/classes/create-classes/ClassDetailsForm";
import Schedule, {
  ScheduleFormRef,
} from "@/components/dashboard/classes/create-classes/Schedule";
import Pricing, {
  PricingFormRef,
} from "@/components/dashboard/classes/create-classes/Pricing";
import Review from "@/components/dashboard/classes/create-classes/Review";
import ActionButtons from "@/components/dashboard/common/ActionButtons";

export default function CreateClassPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const pricingFormRef = useRef<PricingFormRef>(null);

  const stepSlugs = useMemo(
    () => [
      "class-details",
      "thumbnail-and-overviewvideo",
      "schedule",
      "pricing",
    ],
    [],
  );

  const clampIndex = (index: number) =>
    Math.max(0, Math.min(index, stepSlugs.length - 1));

  const slugToIndex = (slug: string | null): number => {
    if (!slug) return 0;

    if (slug === "thumbnails" && typeof window !== "undefined") {
      const hasOverview = searchParams.has("overview-video");
      if (hasOverview) return 1;
    }
    if (slug === "thumbnails-and-overview-video") return 1;
    if (slug === "review") return 4;

    const idx = stepSlugs.indexOf(slug);
    return idx >= 0 ? idx : 0;
  };

  const indexToSlug = (index: number): string => stepSlugs[clampIndex(index)];

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = stepSlugs.length;
  const [classId, setClassId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [stepLoadingStates, setStepLoadingStates] = useState<{
    [key: number]: boolean;
  }>({});

  const classDetailsFormRef = useRef<ClassDetailsFormRef>(null);
  const thumbnailAndOverviewFormRef = useRef<ThumbnailAndOverviewFormRef>(null);
  const scheduleFormRef = useRef<ScheduleFormRef>(null);

  const setStepLoading = (step: number, loading: boolean) => {
    setStepLoadingStates((prev) => ({
      ...prev,
      [step]: loading,
    }));
  };

  const isStepLoading = (step: number) => {
    return stepLoadingStates[step] || false;
  };

  const navigateToStep = (step: number) => {
    const clamped = Math.max(1, Math.min(step, totalSteps));
    const slug = indexToSlug(clamped - 1);
    const currentClassId = classId || searchParams.get("classId");
    const url = currentClassId
      ? `${pathname}?step=${encodeURIComponent(slug)}&classId=${currentClassId}`
      : `${pathname}?step=${encodeURIComponent(slug)}`;
    router.push(url);
    setCurrentStep(clamped);
  };

  const handleNextStep = async () => {
    setIsLoading(true);
    let isValid = true;
    let _formData: any = {};
    let newClassId: string | null = null;

    try {
      switch (currentStep) {
        case 1:
          if (classDetailsFormRef.current) {
            isValid = await classDetailsFormRef.current.triggerValidation();
            if (isValid) {
              _formData = classDetailsFormRef.current.getValues();

              newClassId = await classDetailsFormRef.current.saveToDatabase();
              if (newClassId) {
                setClassId(newClassId);
              }
            }
          }
          break;
        case 2:
          if (thumbnailAndOverviewFormRef.current) {
            isValid =
              await thumbnailAndOverviewFormRef.current.triggerValidation();
            if (isValid) {
              isValid = await thumbnailAndOverviewFormRef.current.uploadFiles();
              if (isValid) {
                _formData = thumbnailAndOverviewFormRef.current.getValues();
              }
            }
          }
          break;
        case 3:
          if (scheduleFormRef.current) {
            isValid = await scheduleFormRef.current.triggerValidation();
          }
          break;
        case 4:
          if (pricingFormRef.current) {
            isValid = await pricingFormRef.current.saveToDatabase();
          }
          break;
        case 5:
          isValid = true;
          break;
        default:
          break;
      }

      if (isValid) {
        const classIdToPass =
          newClassId || classId || searchParams.get("classId");

        if (currentStep === 4) {
          if (classIdToPass) {
            router.push(`${pathname}?step=review&classId=${classIdToPass}`);
          } else {
            router.push(`${pathname}?step=review`);
          }
          setCurrentStep(5);
        } else {
          const nextStepSlug = indexToSlug(currentStep);
          if (classIdToPass) {
            router.push(
              `${pathname}?step=${encodeURIComponent(nextStepSlug)}&classId=${classIdToPass}`,
            );
            if (newClassId) {
              setClassId(newClassId);
            }
          } else {
            navigateToStep(currentStep + 1);
          }
          setCurrentStep(currentStep + 1);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateClass = async () => {
    const classIdToActivate = classId || searchParams.get("classId");

    if (!classIdToActivate) {
      console.error("No class ID available for activation");
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch(
        `/api/classes/${classIdToActivate}/toggle-status`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            isActive: true,
          }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          router.push("/dashboard/classes?created=true");
        } else {
          console.error("Failed to activate class:", data.error);
          alert("Failed to create class. Please try again.");
        }
      } else {
        const errorData = await response.json();
        console.error("Failed to activate class:", errorData.error);
        alert(`Failed to create class: ${errorData.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error creating class:", error);
      alert(
        "An unexpected error occurred while creating the class. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrevStep = () => {
    if (currentStep === 1) {
      router.push("/dashboard/classes/");
      return;
    }

    const classIdToPass = classId || searchParams.get("classId");

    if (currentStep === 5) {
      if (classIdToPass) {
        router.push(`${pathname}?step=pricing&classId=${classIdToPass}`);
      } else {
        router.push(`${pathname}?step=pricing`);
      }
      setCurrentStep(4);
    } else {
      const prevStepSlug = indexToSlug(currentStep - 2);
      if (classIdToPass) {
        router.push(
          `${pathname}?step=${encodeURIComponent(prevStepSlug)}&classId=${classIdToPass}`,
        );
      } else {
        navigateToStep(currentStep - 1);
      }
      setCurrentStep(currentStep - 1);
    }
  };

  useEffect(() => {
    const slug = searchParams.get("step");
    const classIdParam = searchParams.get("classId");
    const index = slugToIndex(slug);
    const stepFromSlug = index + 1;

    if (classIdParam && classIdParam !== classId) {
      setClassId(classIdParam);
    }

    if (stepFromSlug !== currentStep) {
      setCurrentStep(stepFromSlug);
    }
  }, [searchParams, classId]);

  useEffect(() => {
    const setupUrl = () => {
      const classIdParam = searchParams.get("classId");
      const slug = searchParams.get("step");

      if (classIdParam && classIdParam !== classId) {
        setClassId(classIdParam);
      }

      if (!slug) {
        const defaultSlug = indexToSlug(currentStep - 1);
        const url = classIdParam
          ? `${pathname}?step=${encodeURIComponent(defaultSlug)}&classId=${classIdParam}`
          : `${pathname}?step=${encodeURIComponent(defaultSlug)}`;
        router.replace(url);
      }
    };

    setupUrl();
  }, []);

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <ClassDetailsForm
            ref={classDetailsFormRef}
            onLoadingChange={(loading) => setStepLoading(1, loading)}
          />
        );
      case 2:
        return (
          <ThumbnailAndOverview
            ref={thumbnailAndOverviewFormRef}
            onLoadingChange={(loading) => setStepLoading(2, loading)}
          />
        );
      case 3:
        return (
          <Schedule
            ref={scheduleFormRef}
            onLoadingChange={(loading) => setStepLoading(3, loading)}
          />
        );
      case 4:
        return (
          <Pricing
            ref={pricingFormRef}
            onLoadingChange={(loading) => setStepLoading(4, loading)}
          />
        );
      case 5:
        return <Review />;
      default:
        return (
          <ClassDetailsForm
            ref={classDetailsFormRef}
            onLoadingChange={(loading) => setStepLoading(1, loading)}
          />
        );
    }
  };

  return (
    <div className="flex flex-col h-full w-full ">
      <ProgressBar
        currentStep={currentStep === 5 ? 5 : currentStep}
        totalSteps={totalSteps}
      />
      <div className="flex-grow p-2 sm:p-4 w-full relative overflow-y-auto">
        {(isLoading || isStepLoading(currentStep)) && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mb-2"></div>
              <p className="text-gray-600 text-sm">
                {isLoading ? `Processing` : `Loading step`}
              </p>
            </div>
          </div>
        )}
        {renderStepContent()}
      </div>
      <div className="py-0 px-2 sm:p-4 bg-white flex-shrink-0 -mt-2 sm:mt-0">
        <ActionButtons
          onBackClick={handlePrevStep}
          onContinueClick={handleNextStep}
          onCreateClick={handleCreateClass}
          showBackButton={true}
          showContinueButton={currentStep < 5}
          showCreateButton={currentStep === 5}
          createButtonText="Create Class"
          continueButtonText="Continue"
          disabled={isLoading || isStepLoading(currentStep)}
          isLoading={isLoading || isStepLoading(currentStep)}
        />
      </div>
    </div>
  );
}
