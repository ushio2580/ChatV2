import { Request, Response, NextFunction } from 'express';

// Not found middleware
export const notFound = (req: Request, res: Response, next: NextFunction): void => {
  res.status(404).json({
    error: 'Route not found',
    message: `The requested route ${req.method} ${req.path} does not exist`
  });
};
