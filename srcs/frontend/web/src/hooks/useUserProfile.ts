import { useState, useEffect } from "react";
import { useGlobalUIState } from "./useGlobalUIState";

export interface UserData {
  id: string;
  username: string;
  isAdmin: boolean;
  isGuest: boolean;
}

// Create a default guest user
const createDefaultGuestUser = (): UserData => ({
  id: `guest_${Math.floor(1000 + Math.random() * 9000)}`,
  username: "Guest",
  isAdmin: false,
  isGuest: true,
});

export function useUserProfile() {
  const [user, setUser] = useState<UserData>(createDefaultGuestUser());
  const [loading, setLoading] = useState(true);

  // Use global UI state
  const {
    isProfileMenuOpen,
    toggleProfileMenu,
    closeProfileMenu,
    setIsLoading,
  } = useGlobalUIState();

  // Load user data on initial mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Simulate user data fetch (you'll replace this with actual API call)
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Optional: For now, we'll use the default guest user
        // In a real app, you'd fetch actual user data here
        setUser(createDefaultGuestUser());
      } catch (error) {
        console.error("Error loading user data:", error);
        // Fallback to default guest user if fetch fails
        setUser(createDefaultGuestUser());
      } finally {
        setLoading(false);
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [setIsLoading]);

  // Logout function
  const handleLogout = async () => {
    try {
      // Simulate logout API call
      await new Promise((resolve) => setTimeout(resolve, 300));

      console.log("Logging out user:", user?.username);

      // Reset to default guest user
      setUser(createDefaultGuestUser());
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      closeProfileMenu();
    }
  };

  return {
    user,
    loading,
    isProfileMenuOpen,
    toggleProfileMenu,
    closeProfileMenu,
    handleLogout,
  };
}

export default useUserProfile;
