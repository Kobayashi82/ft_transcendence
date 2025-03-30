import { useState, useEffect, createContext, useContext } from "react";

interface GlobalUIState {
  isProfileMenuOpen: boolean;
  isNotificationsOpen: boolean;
  isLoading: boolean;
  openProfileMenu: () => void;
  closeProfileMenu: () => void;
  toggleProfileMenu: () => void;
  openNotifications: () => void;
  closeNotifications: () => void;
  toggleNotifications: () => void;
  closeAllMenus: () => void;
  setIsLoading: (loading: boolean) => void;
}

// Create context with default values
export const GlobalUIContext = createContext<GlobalUIState>({
  isProfileMenuOpen: false,
  isNotificationsOpen: false,
  isLoading: true,
  openProfileMenu: () => {},
  closeProfileMenu: () => {},
  toggleProfileMenu: () => {},
  openNotifications: () => {},
  closeNotifications: () => {},
  toggleNotifications: () => {},
  closeAllMenus: () => {},
  setIsLoading: () => {},
});

// Custom hook to use the context
export const useGlobalUIState = () => useContext(GlobalUIContext);

// Create a function that returns the state and handlers (but no JSX)
export const createGlobalUIState = () => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Profile menu actions
  const openProfileMenu = () => {
    setIsProfileMenuOpen(true);
    setIsNotificationsOpen(false);
  };

  const closeProfileMenu = () => {
    setIsProfileMenuOpen(false);
  };

  const toggleProfileMenu = () => {
    setIsProfileMenuOpen(!isProfileMenuOpen);
    if (!isProfileMenuOpen) {
      setIsNotificationsOpen(false);
    }
  };

  // Notifications actions
  const openNotifications = () => {
    setIsNotificationsOpen(true);
    setIsProfileMenuOpen(false);
  };

  const closeNotifications = () => {
    setIsNotificationsOpen(false);
  };

  const toggleNotifications = () => {
    setIsNotificationsOpen(!isNotificationsOpen);
    if (!isNotificationsOpen) {
      setIsProfileMenuOpen(false);
    }
  };

  // Close all menus
  const closeAllMenus = () => {
    setIsProfileMenuOpen(false);
    setIsNotificationsOpen(false);
  };

  // Setup click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const profileMenu = document.getElementById("profile-menu");
      const profileButton = document.getElementById("profile-button");
      const notificationsMenu = document.getElementById("notifications-menu");
      const notificationsButton = document.getElementById(
        "notifications-button"
      );

      const isOutsideProfileMenu =
        profileMenu &&
        profileButton &&
        !profileMenu.contains(target) &&
        !profileButton.contains(target);

      const isOutsideNotificationsMenu =
        notificationsMenu &&
        notificationsButton &&
        !notificationsMenu.contains(target) &&
        !notificationsButton.contains(target);

      if (isOutsideProfileMenu && isOutsideNotificationsMenu) {
        closeAllMenus();
      } else if (isOutsideProfileMenu && isProfileMenuOpen) {
        closeProfileMenu();
      } else if (isOutsideNotificationsMenu && isNotificationsOpen) {
        closeNotifications();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isProfileMenuOpen, isNotificationsOpen]);

  return {
    isProfileMenuOpen,
    isNotificationsOpen,
    isLoading,
    openProfileMenu,
    closeProfileMenu,
    toggleProfileMenu,
    openNotifications,
    closeNotifications,
    toggleNotifications,
    closeAllMenus,
    setIsLoading,
  };
};

export default useGlobalUIState;
