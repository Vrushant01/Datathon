/**
 * Demo credentials for the KSP Platform portals.
 * Shown only when VITE_DEMO_MODE === 'true'.
 * Keep this file free of production secrets.
 */

export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

export const DEMO_CREDENTIALS = {
  admin: {
    label: 'Admin Console',
    field1Label: 'Username / Email',
    field1Value: 'admin@ksp.gov.in',
    field2Label: 'Password',
    field2Value: 'admin123',
  },
  analytics: {
    label: 'Analytics Portal',
    field1Label: 'Station ID',
    field1Value: '2000',
    field2Label: 'Password',
    field2Value: 'analytics123',
  },
  officer: {
    label: 'Officer Portal',
    field1Label: 'Employee ID',
    field1Value: '10001',
    field2Label: 'Password',
    field2Value: 'password',
  },
} as const;
