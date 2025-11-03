
import React, { createContext, useState, ReactNode, useMemo } from 'react';
import { User, Role } from '../types';

interface UserContextType {
  user: User | null;
  login: (id: string, role: Role) => void;
  logout: () => void;
}

export const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = (id: string, role: Role) => {
    setUser({ id, role });
  };

  const logout = () => {
    setUser(null);
  };

  const value = useMemo(() => ({ user, login, logout }), [user]);

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};
