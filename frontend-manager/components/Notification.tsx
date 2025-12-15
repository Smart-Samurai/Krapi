/**
 * Notification Components
 * 
 * Reusable notification components for displaying success and error messages.
 * 
 * @module components/Notification
 * @example
 * <Notification type="success" message="Operation completed" onClose={handleClose} />
 * <NotificationContainer error={error} success={success} />
 */
import { AlertCircle, CheckCircle, X } from "lucide-react";

/**
 * Notification Props
 * 
 * @interface NotificationProps
 * @property {"error" | "success"} type - Notification type
 * @property {string} message - Notification message
 * @property {Function} onClose - Close handler
 */
interface NotificationProps {
  type: "error" | "success";
  message: string;
  onClose: () => void;
}

/**
 * Notification Component
 * 
 * Displays a single notification (success or error) with close button.
 * 
 * @param {NotificationProps} props - Component props
 * @returns {JSX.Element} Notification component
 * 
 * @example
 * <Notification type="success" message="Saved!" onClose={() => {}} />
 */
export default function Notification({
  type,
  message,
  onClose,
}: NotificationProps) {
  const bgColor = type === "error" ? "bg-error/20" : "bg-success/20";
  const textColor = type === "error" ? "text-error" : "text-success";
  const borderColor =
    type === "error" ? "border-error/30" : "border-success/30";
  const iconColor = type === "error" ? "text-error" : "text-success";
  const Icon = type === "error" ? AlertCircle : CheckCircle;

  return (
    <div
      className={`${bgColor} ${borderColor} border  p-4 mb-4 relative`}
    >
      <div className="flex items-start">
        <Icon className={`${iconColor} h-5 w-5 mt-0.5 mr-3 flex-shrink-0`} />
        <div className="flex-1">
          <p className={`${textColor} text-base font-medium`}>{message}</p>
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

/**
 * Notification Container Props
 * 
 * @interface NotificationContainerProps
 * @property {string | null} [error] - Error message to display
 * @property {string | null} [success] - Success message to display
 * @property {Function} [onClearError] - Clear error handler
 * @property {Function} [onClearSuccess] - Clear success handler
 */
interface NotificationContainerProps {
  error?: string | null;
  success?: string | null;
  onClearError?: () => void;
  onClearSuccess?: () => void;
}

/**
 * Notification Container Component
 * 
 * Container that displays error and/or success notifications.
 * 
 * @param {NotificationContainerProps} props - Component props
 * @returns {JSX.Element} Notification container
 * 
 * @example
 * <NotificationContainer
 *   error={error}
 *   success={success}
 *   onClearError={() => setError(null)}
 *   onClearSuccess={() => setSuccess(null)}
 * />
 */
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
