import { Request, Response } from 'express';

export const login = async (req: Request, res: Response) => {
  // Lógica de autenticación
  res.json({ token: 'jwt_fake' });
};