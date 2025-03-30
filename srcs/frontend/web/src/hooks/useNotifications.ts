import { useState, useEffect } from "react";
import { useGlobalUIState } from "./useGlobalUIState";

export interface NotificationAction {
  label: string;
  actionType: "accept" | "decline" | "join" | "ignore" | "dismiss";
  action: () => void;
}

export interface Notification {
  id: string;
  message: string;
  read: boolean;
  timestamp: string;
  type: "info" | "friend_request" | "tournament" | "game_result";
  link?: string;
  actions?: NotificationAction[];
}

// Global initialization flag
let initialized = false;

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Use global UI state
  const {
    isNotificationsOpen,
    toggleNotifications,
    closeNotifications,
    isLoading,
  } = useGlobalUIState();

  // Load notifications when global loading is complete
  useEffect(() => {
    const loadNotifications = async () => {
      // Only load if not already initialized and global loading is complete
      if (!initialized && !isLoading) {
        try {
          // Simulate loading notifications
          await new Promise((resolve) => setTimeout(resolve, 300));

          const mockNotifications = generateTestNotifications(6);
          setNotifications(mockNotifications);

          // Mark as initialized
          initialized = true;
        } catch (error) {
          console.error("Error loading notifications:", error);
        }
      }
    };

    loadNotifications();
  }, [isLoading]);

  // Notification handling methods remain the same as in previous implementation
  const markAsRead = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
  };

  const dismissNotification = (notificationId: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // Specific notification action handlers
  const handleAcceptFriendRequest = (notificationId: string) => {
    console.log("Accepting friend request", notificationId);
    dismissNotification(notificationId);
  };

  const handleDeclineFriendRequest = (notificationId: string) => {
    console.log("Declining friend request", notificationId);
    dismissNotification(notificationId);
  };

  const handleJoinTournament = (notificationId: string) => {
    console.log("Joining tournament", notificationId);
    dismissNotification(notificationId);
  };

  const handleDismissNotification = (notificationId: string) => {
    dismissNotification(notificationId);
  };

  // Test notifications generation
  const generateTestNotifications = (count = 6) => {
    const notificationTypes = [
      {
        type: "friend_request",
        message: "New friend request from Alex",
        hasActions: true,
      },
      {
        type: "tournament",
        message: "You've been invited to a tournament",
        hasActions: true,
        hasLink: true,
      },
      {
        type: "game_result",
        message: "Game results are available",
        hasLink: true,
      },
      {
        type: "info",
        message: "Weekly server maintenance scheduled",
      },
    ];

    const mockNotifications: Notification[] = [];

    for (let i = 0; i < count; i++) {
      const randomType = notificationTypes[i % notificationTypes.length];
      const timeOffset = Math.floor(Math.random() * 12) * 30 * 60000;

      const notification: Notification = {
        id: `notification-${i}`,
        message: `${randomType.message} ${i + 1}`,
        read: i % 3 === 0,
        timestamp: new Date(Date.now() - timeOffset).toISOString(),
        type: randomType.type as any,
      };

      if (randomType.hasLink) {
        notification.link = "/game/results";
      }

      if (randomType.hasActions) {
        if (randomType.type === "friend_request") {
          notification.actions = [
            {
              label: "Accept",
              actionType: "accept",
              action: () => handleAcceptFriendRequest(notification.id),
            },
            {
              label: "Decline",
              actionType: "decline",
              action: () => handleDeclineFriendRequest(notification.id),
            },
          ];
        } else if (randomType.type === "tournament") {
          notification.actions = [
            {
              label: "Join",
              actionType: "join",
              action: () => handleJoinTournament(notification.id),
            },
            {
              label: "Ignore",
              actionType: "ignore",
              action: () => handleDismissNotification(notification.id),
            },
          ];
        }
      }

      mockNotifications.push(notification);
    }

    return mockNotifications;
  };

  // Utility methods
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) {
      return `${diffMins} min${diffMins !== 1 ? "s" : ""} ago`;
    } else if (diffMins < 1440) {
      const hours = Math.floor(diffMins / 60);
      return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
    } else {
      const days = Math.floor(diffMins / 1440);
      return `${days} day${days !== 1 ? "s" : ""} ago`;
    }
  };

  // SVG icon methods
  const getAcceptIconSvg = (size = 14) => {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
  };

  const getDeclineIconSvg = (size = 14) => {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
  };

  // Method to get SVG icon based on action type
  const getActionIconSvg = (actionType: string, size = 14) => {
    switch (actionType) {
      case "accept":
      case "join":
        return getAcceptIconSvg(size);
      case "decline":
      case "ignore":
      case "dismiss":
        return getDeclineIconSvg(size);
      default:
        return "";
    }
  };

  // Calculate unread notifications count
  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    isNotificationsOpen,
    unreadNotificationsCount,
    toggleNotifications,
    closeNotifications,
    markAsRead,
    dismissNotification,
    clearAllNotifications,
    handleAcceptFriendRequest,
    handleDeclineFriendRequest,
    handleJoinTournament,
    handleDismissNotification,
    formatTimestamp,
    getActionIconSvg,
  };
}

export default useNotifications;
