import React from "react";

interface ActionButtonsProps {
  onBackClick?: () => void;
  onContinueClick?: () => void;
  onCreateClick?: () => void;
  showBackButton?: boolean;
  showContinueButton?: boolean;
  showCreateButton?: boolean;
  backButtonText?: string;
  continueButtonText?: string;
  createButtonText?: string;
  continueButtonType?: "button" | "submit" | "reset";
  disabled?: boolean;
  isLoading?: boolean;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  onBackClick,
  onContinueClick,
  onCreateClick,
  showBackButton = true,
  showContinueButton = true,
  showCreateButton = false,
  backButtonText = "Back",
  continueButtonText = "Continue",
  createButtonText = "Create Class",
  continueButtonType = "submit",
  disabled = false,
  isLoading = false,
}) => {
  return (
    <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 sm:space-x-0 w-full">
      {/* Mobile order: Create/Continue first, Back last */}
      <div className="flex flex-col sm:hidden gap-1 w-full">
        {showCreateButton && (
          <button
            type="button"
            onClick={onCreateClick}
            className="cursor-pointer flex-1 px-4 py-2 border border-transparent rounded-md text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 min-h-[44px]"
            disabled={disabled}
          >
            {createButtonText}
          </button>
        )}
        {showContinueButton && (
          <button
            type={continueButtonType}
            onClick={onContinueClick}
            className="cursor-pointer flex-1 px-4 py-2 border border-transparent rounded-md text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center min-h-[44px]"
            disabled={disabled || isLoading}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                Processing...
              </>
            ) : (
              continueButtonText
            )}
          </button>
        )}
        {showBackButton && (
          <button
            type="button"
            onClick={onBackClick}
            className="cursor-pointer flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-bold text-gray-900 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 min-h-[44px]"
          >
            {backButtonText}
          </button>
        )}
      </div>

      {/* Desktop order: Back first, then Create/Continue */}
      <div className="hidden sm:flex flex-row gap-4 w-full">
        {showBackButton && (
          <button
            type="button"
            onClick={onBackClick}
            className="cursor-pointer flex-1 px-6 py-3 border border-gray-300 rounded-md text-sm font-bold text-gray-900 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 min-h-[44px]"
          >
            {backButtonText}
          </button>
        )}
        {showCreateButton && (
          <button
            type="button"
            onClick={onCreateClick}
            className="cursor-pointer flex-1 px-6 py-3 border border-transparent rounded-md text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 min-h-[44px]"
            disabled={disabled}
          >
            {createButtonText}
          </button>
        )}
        {showContinueButton && (
          <button
            type={continueButtonType}
            onClick={onContinueClick}
            className="cursor-pointer flex-1 px-6 py-3 border border-transparent rounded-md text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center min-h-[44px]"
            disabled={disabled || isLoading}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                Processing...
              </>
            ) : (
              continueButtonText
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default ActionButtons;
