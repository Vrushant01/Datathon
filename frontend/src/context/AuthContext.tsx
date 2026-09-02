import { authFetch } from '../utils/authFetch';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { mockDb, EmployeeRow } from '../utils/mockDb';

export type UserRole = 'Admin' | 'Officer' | 'Analytics' | null;

interface AuthUser {
  email: string;
  role: UserRole;
  employeeId?: number;
  kgid?: string;
  firstName?: string;
  stationName?: string;
  districtName?: string;
  unitId?: number;
}

interface AuthContextType {
  user: AuthUser | null;
  role: UserRole;
  isAuthenticated: boolean;
  login: (idOrEmail: string, passcode: string, loginType: 'admin' | 'officer' | 'analytics') => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  refreshUserData: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem('ksp_auth_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('ksp_auth_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('ksp_auth_user');
    }
  }, [user]);


  const refreshUserData = () => {
    if (user && user.role === 'Officer' && user.employeeId) {
      const employees = mockDb.getEmployees();
      const emp = employees.find(e => e.EmployeeID === user.employeeId);
      if (emp) {
        const stations = mockDb.getUnits();
        const districts = mockDb.getDistricts();
        const station = stations.find(s => s.UnitID === emp.UnitID)?.UnitName || 'Unknown Station';
        const district = districts.find(d => d.DistrictID === emp.DistrictID)?.DistrictName || 'Unknown District';

        const updatedUser: AuthUser = {
          email: emp.email || `${emp.EmployeeID}@ksp.gov.in`,
          role: 'Officer',
          employeeId: emp.EmployeeID,
          kgid: emp.KGID,
          firstName: emp.FirstName,
          stationName: station,
          districtName: district
        };
        setUser(updatedUser);

      }
    }
  };

  const login = async (
    idOrEmail: string,
    passcode: string,
    loginType: 'admin' | 'officer' | 'analytics'
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await authFetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idOrEmail, passcode, loginType })
      });

      const data = await response.json();

      if (data.success && data.token) {
        localStorage.setItem('token', data.token);
        setUser(data.user);
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message || 'Authentication failed' };
      }
    } catch (error) {
      console.error('Login request failed', error);
      return { success: false, message: 'Network error or backend unreachable.' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, role: user?.role || null, isAuthenticated: !!user, login, logout, refreshUserData }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
