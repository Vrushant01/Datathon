import { Request, Response } from 'express';

export const startMigration = async (req: Request, res: Response) => {
  res.status(400).json({ error: 'MongoDB has been permanently removed. Migration is no longer possible.' });
};

export const getMigrationStatus = async (req: Request, res: Response) => {
  res.json({
    status: 'completed',
    progress: 100,
    total: 100,
    currentTable: 'None',
    message: 'MongoDB removed. CloudScale is the single source of truth.'
  });
};
