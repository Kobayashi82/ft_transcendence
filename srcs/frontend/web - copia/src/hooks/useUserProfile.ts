import { useState, useEffect } from "react";
import { useGlobalUIState } from "./useGlobalUIState";

export interface UserData {
  id: string;
  username: string;
  isAdmin: boolean;
  isGuest: boolean;
}

// Añadimos un estado global para saber si todos los componentes están listos
let initialized = false;

export function useUserProfile() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(!initialized);

  // Use global UI state
  const {
    isProfileMenuOpen,
    toggleProfileMenu,
    closeProfileMenu,
    setIsLoading,
  } = useGlobalUIState();

  // Cargar datos del usuario al inicio
  useEffect(() => {
    // Si ya está inicializado, usamos los datos en caché
    if (initialized) {
      setLoading(false);
      return;
    }

    // Simulamos una carga completa de todos los datos
    const fetchAllData = async () => {
      setLoading(true);
      setIsLoading(true);

      try {
        // Simulamos carga de datos del usuario
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Creamos un usuario simulado
        const guestId = `guest_${Math.floor(1000 + Math.random() * 9000)}`;
        const mockUser: UserData = {
          id: guestId,
          username: guestId,
          isAdmin: Math.random() > 0.8,
          isGuest: true,
        };

        // Simulamos también la carga de notificaciones u otros datos
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Actualizamos el estado
        setUser(mockUser);

        // Marcamos como inicializado para evitar futuras cargas
        initialized = true;
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        // Importante: actualizamos ambos estados de carga al mismo tiempo
        setLoading(false);
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, [setIsLoading]);

  // Función de logout
  const handleLogout = async () => {
    try {
      // Simular llamada a la API de logout
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Aquí iría la lógica real de logout
      console.log("Logging out user:", user?.username);

      // Resetear usuario o redirigir al login
      // window.location.href = '/login';
    } catch (error) {
      console.error("Error during logout:", error);
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
