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

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Use global UI state
  const {
    isNotificationsOpen,
    toggleNotifications,
    closeNotifications,
    isLoading,
  } = useGlobalUIState();

  // Cargar notificaciones solo cuando no esté en modo de carga
  useEffect(() => {
    if (!isLoading) {
      // Cargar notificaciones cuando termine la carga global
      setNotifications(generateTestNotifications(6));
    }
  }, [isLoading]);

  // Marcar como leída
  const markAsRead = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
  };

  // Eliminar notificación
  const dismissNotification = (notificationId: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
  };

  // Marcar todas como leídas/eliminar todas
  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // Acciones específicas
  const handleAcceptFriendRequest = (notificationId: string) => {
    console.log("Accepting friend request", notificationId);
    // Aquí iría la llamada a la API
    dismissNotification(notificationId);
  };

  const handleDeclineFriendRequest = (notificationId: string) => {
    console.log("Declining friend request", notificationId);
    // Aquí iría la llamada a la API
    dismissNotification(notificationId);
  };

  const handleJoinTournament = (notificationId: string) => {
    console.log("Joining tournament", notificationId);
    // Aquí iría la llamada a la API
    dismissNotification(notificationId);
  };

  const handleDismissNotification = (notificationId: string) => {
    dismissNotification(notificationId);
  };

  // Función para generar notificaciones de prueba
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

    // Generar notificaciones aleatorias
    const mockNotifications = [];

    for (let i = 0; i < count; i++) {
      const randomType = notificationTypes[i % notificationTypes.length];
      const timeOffset = Math.floor(Math.random() * 12) * 30 * 60000; // Tiempo aleatorio (0-12 horas)

      const notification: Notification = {
        id: `notification-${i}`,
        message: `${randomType.message} ${i + 1}`,
        read: i % 3 === 0, // Algunas leídas, otras no
        timestamp: new Date(Date.now() - timeOffset).toISOString(),
        type: randomType.type as any,
      };

      // Añadir link si corresponde
      if (randomType.hasLink) {
        notification.link = "/game/results";
      }

      // Añadir acciones si corresponde
      if (randomType.hasActions) {
        if (randomType.type === "friend_request") {
          // Las funciones se redefinirán después para incluir el ID correcto
          notification.actions = [
            {
              label: "Accept",
              actionType: "accept",
              action: () => {}, // Placeholder
            },
            {
              label: "Decline",
              actionType: "decline",
              action: () => {}, // Placeholder
            },
          ];
        } else if (randomType.type === "tournament") {
          notification.actions = [
            {
              label: "Join",
              actionType: "join",
              action: () => {}, // Placeholder
            },
            {
              label: "Ignore",
              actionType: "ignore",
              action: () => {}, // Placeholder
            },
          ];
        }
      }

      mockNotifications.push(notification);
    }

    // Ahora asignamos las funciones reales con los IDs correctos
    return mockNotifications.map((notification) => {
      if (notification.actions) {
        notification.actions = notification.actions.map((action) => {
          if (action.actionType === "accept") {
            return {
              ...action,
              action: () => handleAcceptFriendRequest(notification.id),
            };
          } else if (action.actionType === "decline") {
            return {
              ...action,
              action: () => handleDeclineFriendRequest(notification.id),
            };
          } else if (action.actionType === "join") {
            return {
              ...action,
              action: () => handleJoinTournament(notification.id),
            };
          } else if (
            action.actionType === "ignore" ||
            action.actionType === "dismiss"
          ) {
            return {
              ...action,
              action: () => handleDismissNotification(notification.id),
            };
          }
          return action;
        });
      }
      return notification;
    });
  };

  // Utilidades
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

  // Iconos SVG como strings en vez de JSX elements
  // Esto evita el error de ESBuild en un archivo .ts normal (no .tsx)
  const getAcceptIconSvg = (size = 14) => {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
  };

  const getDeclineIconSvg = (size = 14) => {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
  };

  // Método para obtener el string SVG basado en el tipo de acción
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
