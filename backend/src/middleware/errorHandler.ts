import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';

// Validation middleware
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      next();
      return;
    }

    res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  };
};

// Error handling middleware
export const errorHandler = (error: any, req: Request, res: Response, next: NextFunction): void => {
  console.error('Error:', error);

  // Prisma errors
  if (error.code === 'P2002') {
    res.status(409).json({
      error: 'Duplicate entry',
      message: 'A record with this information already exists'
    });
    return;
  }

  if (error.code === 'P2025') {
    res.status(404).json({
      error: 'Record not found',
      message: 'The requested record does not exist'
    });
    return;
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    res.status(401).json({
      error: 'Invalid token',
      message: 'The provided token is invalid'
    });
    return;
  }

  if (error.name === 'TokenExpiredError') {
    res.status(401).json({
      error: 'Token expired',
      message: 'The provided token has expired'
    });
    return;
  }

  // Validation errors
  if (error.name === 'ValidationError') {
    res.status(400).json({
      error: 'Validation failed',
      message: error.message
    });
    return;
  }

  // Default error
  res.status(error.status || 500).json({
    error: error.message || 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.stack : 'Something went wrong'
  });
};

// Not found middleware
export const notFound = (req: Request, res: Response, next: NextFunction): void => {
  res.status(404).json({
    error: 'Route not found',
    message: `The requested route ${req.method} ${req.path} does not exist`
  });
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
