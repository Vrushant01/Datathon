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
    // Artificial slight delay for professional feel
    await new Promise(resolve => setTimeout(resolve, 600));

    if (loginType === 'admin') {
      // Admin Login Check
      // Standard credentials for Admin Portal
      if (
        (idOrEmail.toLowerCase() === 'admin@ksp.gov.in' || idOrEmail.toLowerCase() === 'admin') &&
        passcode === 'admin123'
      ) {
        const adminUser: AuthUser = {
          email: 'admin@ksp.gov.in',
          role: 'Admin',
          firstName: 'Administrator KSP'
        };
        setUser(adminUser);
        return { success: true, message: 'Admin authenticated successfully' };
      }
      return { success: false, message: 'Invalid Admin credentials' };
    } else if (loginType === 'analytics') {
      // Analytics Login Check
      const stations = mockDb.getUnits().filter(u => u.TypeID === 1);
      
      if (passcode !== 'analytics123') {
        return { success: false, message: 'Invalid Analytics passcode. Try "analytics123"' };
      }

      // Find station by UnitID or partial name
      const targetStation = stations.find(s => 
        s.UnitID.toString() === idOrEmail || 
        s.UnitName.toLowerCase().includes(idOrEmail.toLowerCase().replace('analytics_', '').replace('_analytics', ''))
      );

      if (!targetStation) {
        return { success: false, message: 'Station not found for analytics access.' };
      }

      const districts = mockDb.getDistricts();
      const district = districts.find(d => d.DistrictID === targetStation.DistrictID)?.DistrictName || 'Unknown District';

      const analyticsUser = {
        email: `analytics_${targetStation.UnitID}@ksp.gov.in`,
        role: 'Analytics' as UserRole,
        firstName: 'Station Analytics',
        stationName: targetStation.UnitName,
        districtName: district,
        unitId: targetStation.UnitID
      };
      setUser(analyticsUser);
      return { success: true, message: 'Analytics portal authenticated successfully' };
      
    } else {
      // Officer Login Check
      // Accepts EmployeeID or KGID, password check is simple 'password' for demo
      const employees = mockDb.getEmployees();
      const emp = employees.find(
        e => e.EmployeeID.toString() === idOrEmail || e.KGID.toLowerCase() === idOrEmail.toLowerCase()
      );

      if (!emp) {
        return { success: false, message: 'Employee ID or KGID not found' };
      }

      if (emp.status === 'Suspended') {
        return { success: false, message: 'This officer profile has been suspended. Contact Admin.' };
      }

      if (passcode === 'password' || passcode === 'ksp123') {
        const stations = mockDb.getUnits();
        const districts = mockDb.getDistricts();
        const station = stations.find(s => s.UnitID === emp.UnitID)?.UnitName || 'Unknown Station';
        const district = districts.find(d => d.DistrictID === emp.DistrictID)?.DistrictName || 'Unknown District';

        const officerUser: AuthUser = {
          email: emp.email || `${emp.EmployeeID}@ksp.gov.in`,
          role: 'Officer',
          employeeId: emp.EmployeeID,
          kgid: emp.KGID,
          firstName: emp.FirstName,
          stationName: station,
          districtName: district
        };
        setUser(officerUser);
        return { success: true, message: 'Officer authenticated successfully' };
      }

      return { success: false, message: 'Invalid password. Try "password"' };
    }
  };

  const logout = () => {
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
