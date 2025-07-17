import { AlertCircle, CheckCircle, X } from "lucide-react";

interface NotificationProps {
  type: "error" | "success";
  message: string;
  onClose: () => void;
}

export default function Notification({
  type,
  message,
  onClose,
}: NotificationProps) {
  const bgColor = type === "error" ? "bg-red-50" : "bg-green-50";
  const textColor = type === "error" ? "text-red-800" : "text-green-800";
  const borderColor = type === "error" ? "border-red-200" : "border-green-200";
  const iconColor = type === "error" ? "text-red-400" : "text-green-400";
  const Icon = type === "error" ? AlertCircle : CheckCircle;

  return (
    <div
      className={`${bgColor} ${borderColor} border rounded-lg p-4 mb-4 relative`}
    >
      <div className="flex items-start">
        <Icon className={`${iconColor} h-5 w-5 mt-0.5 mr-3 flex-shrink-0`} />
        <div className="flex-1">
          <p className={`${textColor} text-sm font-medium`}>{message}</p>
        </div>
        <button
          onClick={onClose}
          className={`${textColor} hover:${textColor}/80 ml-4 flex-shrink-0`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

interface NotificationContainerProps {
  error?: string | null;
  success?: string | null;
  onClearError?: () => void;
  onClearSuccess?: () => void;
}

export function NotificationContainer({
  error,
  success,
  onClearError,
  onClearSuccess,
}: NotificationContainerProps) {
  return (
    <div className="space-y-2">
      {error && (
        <Notification
          type="error"
          message={error}
          onClose={onClearError || (() => {})}
        />
      )}
      {success && (
        <Notification
          type="success"
          message={success}
          onClose={onClearSuccess || (() => {})}
        />
      )}
    </div>
  );
}
