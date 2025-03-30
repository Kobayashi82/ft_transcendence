import React from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import useNotifications, {
  Notification as NotificationType,
} from "../../hooks/useNotifications";

interface NotificationsPanelProps {
  isMobile?: boolean;
  onClose?: () => void;
}

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({
  isMobile = false,
  onClose,
}) => {
  const {
    notifications,
    unreadNotificationsCount,
    isNotificationsOpen,
    toggleNotifications,
    dismissNotification,
    clearAllNotifications,
    formatTimestamp,
    getActionIconSvg,
  } = useNotifications();

  // Función para renderizar un icono de acción usando dangerouslySetInnerHTML
  const renderActionIcon = (actionType: string, size = 14) => {
    const iconSvg = getActionIconSvg(actionType, size);
    return (
      <span
        dangerouslySetInnerHTML={{ __html: iconSvg }}
        className="mr-1 inline-block"
      />
    );
  };

  // Renderizar notificación individual
  const renderNotification = (notification: NotificationType) => (
    <div
      key={notification.id}
      className={`${
        isMobile ? "p-3" : "px-4 py-3"
      } hover:bg-gray-700 transition-colors bg-gray-800`}
    >
      <div className="flex justify-end">
        <button
          onClick={(e) => {
            e.stopPropagation();
            dismissNotification(notification.id);
          }}
          className="text-gray-500 hover:text-gray-300"
          title="Dismiss"
        >
          <svg
            width={14}
            height={14}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div className="flex-grow">
        {notification.link ? (
          <Link
            to={notification.link}
            className="block"
            onClick={() => {
              dismissNotification(notification.id);
              if (onClose) onClose();
            }}
          >
            <p className="text-sm text-gray-200 mb-1">{notification.message}</p>
            <p className="text-xs text-gray-400">
              {formatTimestamp(notification.timestamp)}
            </p>
          </Link>
        ) : (
          <div>
            <p className="text-sm text-gray-200 mb-1">{notification.message}</p>
            <p className="text-xs text-gray-400 mb-2">
              {formatTimestamp(notification.timestamp)}
            </p>
          </div>
        )}
      </div>

      {notification.actions && (
        <div className="flex gap-2 mt-2">
          {notification.actions.map((action, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                action.action();
                if (onClose) onClose();
              }}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-gray-700 hover:bg-gray-600 text-gray-200"
            >
              {renderActionIcon(action.actionType)}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // Bell de notificaciones para versión desktop
  if (!isMobile) {
    return (
      <div className="relative">
        <button
          id="notifications-button"
          className="relative p-2 text-gray-300 hover:text-white transition-colors focus:outline-none rounded-full hover:bg-gray-800"
          onClick={toggleNotifications}
        >
          <Bell size={20} />
          {unreadNotificationsCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {unreadNotificationsCount}
            </span>
          )}
        </button>

        {/* Panel desplegable de notificaciones */}
        {isNotificationsOpen && (
          <div
            id="notifications-menu"
            className="absolute right-0 mt-2 w-96 bg-gray-800 rounded-lg shadow-lg border border-gray-700 overflow-hidden z-50"
          >
            <div className="flex justify-between items-center px-4 py-3 border-b border-gray-700">
              <h3 className="text-sm font-medium text-white">Notifications</h3>
              <button
                onClick={clearAllNotifications}
                className="text-xs text-indigo-400 hover:text-indigo-300"
              >
                Mark all as read
              </button>
            </div>

            <div
              className={`${
                notifications.length > 4 ? "max-h-96 overflow-y-auto" : ""
              }`}
            >
              {notifications.length > 0 ? (
                <div className="divide-y divide-gray-700">
                  {notifications.map(renderNotification)}
                </div>
              ) : (
                <div className="p-4 text-center text-sm text-gray-400">
                  No notifications
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Versión para móvil
  return (
    <div className="bg-gray-800 rounded-lg mb-4">
      <div className="flex justify-between items-center px-4 py-3 border-b border-gray-700">
        <div className="flex items-center">
          <Bell size={16} className="text-gray-400 mr-2" />
          <h3 className="text-sm font-medium text-white">Notifications</h3>
          {unreadNotificationsCount > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {unreadNotificationsCount}
            </span>
          )}
        </div>
        <button
          onClick={clearAllNotifications}
          className="text-xs text-indigo-400 hover:text-indigo-300"
        >
          Mark all as read
        </button>
      </div>
      <div
        className={`${
          notifications.length > 4 ? "max-h-80 overflow-y-auto" : ""
        }`}
      >
        {notifications.length > 0 ? (
          <div className="divide-y divide-gray-700">
            {notifications.map(renderNotification)}
            {notifications.length > 3 && (
              <Link
                to="/notifications"
                className="block p-3 text-center text-sm text-indigo-400 hover:bg-gray-700 transition-colors"
                onClick={onClose}
              >
                View all notifications
              </Link>
            )}
          </div>
        ) : (
          <div className="p-4 text-center text-sm text-gray-400">
            No notifications
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPanel;
