import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/20/solid";

interface AlertProps {
  type: "success" | "error";
  title: string;
  message: string;
  onDismiss?: () => void;
}

export default function Alert({ type, title, message, onDismiss }: AlertProps) {
  const isSuccess = type === "success";

  const icon = isSuccess ? CheckCircleIcon : XCircleIcon;
  const IconComponent = icon;

  const baseClasses = "rounded-md p-4";
  const successClasses = "bg-green-50";
  const errorClasses = "bg-red-50";

  const iconClasses = isSuccess ? "text-green-400" : "text-red-400";

  const titleClasses = isSuccess ? "text-green-800" : "text-red-800";

  const messageClasses = isSuccess ? "text-green-700" : "text-red-700";

  const buttonClasses = isSuccess
    ? "bg-green-50 text-green-800 hover:bg-green-100 focus-visible:outline-green-600"
    : "bg-red-50 text-red-800 hover:bg-red-100 focus-visible:outline-red-600";

  return (
    <div
      className={`${baseClasses} ${isSuccess ? successClasses : errorClasses}`}
    >
      <div className="flex">
        <div className="shrink-0">
          <IconComponent
            aria-hidden="true"
            className={`size-5 ${iconClasses}`}
          />
        </div>
        <div className="ml-3">
          <h3 className={`text-sm font-medium ${titleClasses}`}>{title}</h3>
          <div className={`mt-2 text-sm ${messageClasses}`}>
            <p>{message}</p>
          </div>
          {onDismiss && (
            <div className="mt-4">
              <div className="-mx-2 -my-1.5 flex">
                <button
                  type="button"
                  onClick={onDismiss}
                  className={`cursor-pointer rounded-md px-2 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 ${buttonClasses}`}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
