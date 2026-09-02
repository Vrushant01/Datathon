import express from 'express';
import jwt from 'jsonwebtoken';
import { RepositoryFactory } from '../repositories/RepositoryFactory';

const router = express.Router();

export const generateToken = (payload: any) => {
  return jwt.sign(payload, process.env.JWT_SECRET || 'fallback-secret-for-demo', { expiresIn: '8h' });
};

router.post('/login', async (req, res) => {
  try {
    const { idOrEmail, passcode, loginType } = req.body;
    const db = RepositoryFactory.getRepository(req);

    if (loginType === 'admin') {
      if (
        (idOrEmail.toLowerCase() === 'admin@ksp.gov.in' || idOrEmail.toLowerCase() === 'admin') &&
        passcode === 'admin123'
      ) {
        const adminUser = {
          email: 'admin@ksp.gov.in',
          role: 'Admin',
          firstName: 'Administrator KSP'
        };
        const token = generateToken(adminUser);
        return res.json({ success: true, token, user: adminUser, message: 'Admin authenticated successfully' });
      }
      return res.status(401).json({ success: false, message: 'Invalid Admin credentials' });
      
    } else if (loginType === 'analytics') {
      const allUnits = await db.getUnits();
      const stations = allUnits.filter((u: any) => u.TypeID === 1);
      
      if (passcode !== 'analytics123') {
        return res.status(401).json({ success: false, message: 'Invalid Analytics passcode. Try "analytics123"' });
      }

      const targetStation = stations.find((s: any) => 
        s.UnitID.toString() === idOrEmail || 
        s.UnitName.toLowerCase().includes(idOrEmail.toLowerCase().replace('analytics_', '').replace('_analytics', ''))
      );

      if (!targetStation) {
        return res.status(401).json({ success: false, message: 'Station not found for analytics access.' });
      }

      const districts = await db.getDistricts();
      const district = districts.find((d: any) => d.DistrictID === targetStation.DistrictID)?.DistrictName || 'Unknown District';

      const analyticsUser = {
        email: `analytics_${targetStation.UnitID}@ksp.gov.in`,
        role: 'Analytics',
        firstName: 'Station Analytics',
        stationName: targetStation.UnitName,
        districtName: district,
        unitId: targetStation.UnitID
      };
      const token = generateToken(analyticsUser);
      return res.json({ success: true, token, user: analyticsUser, message: 'Analytics portal authenticated successfully' });

    } else {
      // Officer
      const employees = await db.getEmployees();
      const emp = employees.find(
        (e: any) => e.EmployeeID.toString() === idOrEmail || (e.KGID && e.KGID.toLowerCase() === idOrEmail.toLowerCase())
      );

      if (!emp) {
        return res.status(401).json({ success: false, message: 'Employee ID or KGID not found' });
      }

      if (emp.status === 'Suspended') {
        return res.status(403).json({ success: false, message: 'This officer profile has been suspended. Contact Admin.' });
      }

      if (passcode === 'password' || passcode === 'ksp123') {
        const stations = await db.getUnits();
        const districts = await db.getDistricts();
        const station = stations.find((s: any) => s.UnitID === emp.UnitID)?.UnitName || 'Unknown Station';
        const district = districts.find((d: any) => d.DistrictID === emp.DistrictID)?.DistrictName || 'Unknown District';

        const officerUser = {
          email: emp.email || `${emp.EmployeeID}@ksp.gov.in`,
          role: 'Officer',
          employeeId: emp.EmployeeID,
          kgid: emp.KGID,
          firstName: emp.FirstName,
          stationName: station,
          districtName: district
        };
        const token = generateToken(officerUser);
        return res.json({ success: true, token, user: officerUser, message: 'Officer authenticated successfully' });
      }

      return res.status(401).json({ success: false, message: 'Invalid password. Try "password"' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

export default router;
