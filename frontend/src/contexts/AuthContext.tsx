import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthTokens, LoginData, RegisterData, AuthContextType } from '../types';
import { authAPI } from '../services/api';
import { socketService } from '../services/socketService';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is authenticated
  const isAuthenticated = !!user && !!tokens;

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedTokens = localStorage.getItem('authTokens');
        if (storedTokens) {
          const parsedTokens = JSON.parse(storedTokens);
          setTokens(parsedTokens);

          // Verify token and get user data
          const response = await authAPI.getCurrentUser(parsedTokens.accessToken);
          if (response.user) {
            setUser(response.user);
            
            // Connect to socket
            socketService.connect(parsedTokens.accessToken);
          } else {
            // Token is invalid, clear storage
            localStorage.removeItem('authTokens');
            setTokens(null);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        localStorage.removeItem('authTokens');
        setTokens(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Save tokens to localStorage when they change
  useEffect(() => {
    if (tokens) {
      localStorage.setItem('authTokens', JSON.stringify(tokens));
    } else {
      localStorage.removeItem('authTokens');
    }
  }, [tokens]);

  // Login function
  const login = async (data: LoginData): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await authAPI.login(data);
      
      if (response.error) {
        throw new Error(response.error);
      }

      setUser(response.user);
      setTokens(response.tokens);
      
      // Connect to socket
      socketService.connect(response.tokens.accessToken);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Register function
  const register = async (data: RegisterData): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await authAPI.register(data);
      
      if (response.error) {
        throw new Error(response.error);
      }

      setUser(response.user);
      setTokens(response.tokens);
      
      // Connect to socket
      socketService.connect(response.tokens.accessToken);
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      if (tokens) {
        await authAPI.logout(tokens.accessToken);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Disconnect socket
      socketService.disconnect();
      
      // Clear state
      setUser(null);
      setTokens(null);
      localStorage.removeItem('authTokens');
    }
  };

  // Refresh token function
  const refreshToken = async (): Promise<void> => {
    try {
      if (!tokens?.refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await authAPI.refreshToken(tokens.refreshToken);
      
      if (response.error) {
        throw new Error(response.error);
      }

      setTokens(response.tokens);
      
      // Reconnect socket with new token
      socketService.disconnect();
      socketService.connect(response.tokens.accessToken);
    } catch (error) {
      console.error('Token refresh error:', error);
      logout();
    }
  };


  // Auto-refresh token before expiration
  useEffect(() => {
    if (!tokens?.accessToken) return;

    const tokenExpirationTime = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    const refreshTime = tokenExpirationTime - 60 * 60 * 1000; // 1 hour before expiration

    const timeout = setTimeout(() => {
      refreshToken();
    }, refreshTime);

    return () => clearTimeout(timeout);
  }, [tokens]);

  const value: AuthContextType = {
    user,
    tokens,
    login,
    register,
    logout,
    isAuthenticated,
    isLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
