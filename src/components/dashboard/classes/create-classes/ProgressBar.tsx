import React from "react";
import { CheckIcon } from "@heroicons/react/20/solid";

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  currentStep,
  totalSteps,
}) => {
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);

  return (
    <div className="flex flex-col items-center py-8">
      <div className="flex items-center justify-center w-full max-w-md">
        {steps.map((step, index) => {
          const isCompleted = step < currentStep;
          const isCurrent = step === currentStep;

          return (
            <React.Fragment key={step}>
              <div
                className={`relative flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  isCompleted || isCurrent
                    ? "border-blue-600"
                    : "border-gray-300"
                } ${isCompleted ? "bg-blue-600" : "bg-white"} text-sm font-semibold`}
              >
                {isCompleted ? (
                  <CheckIcon className="h-5 w-5 text-white" />
                ) : (
                  <div
                    className={`w-3 h-3 rounded-full ${
                      isCurrent ? "bg-blue-600" : "bg-gray-300"
                    }`}
                  />
                )}
              </div>
              {index < totalSteps - 1 && (
                <div
                  className={`flex-1 h-0.5 ${step < currentStep ? "bg-blue-600" : "bg-gray-200"}`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressBar;
