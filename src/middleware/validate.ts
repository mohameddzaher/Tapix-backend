// ============================================
// Tapix API - Validation Middleware
// ============================================

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

type ValidationSource = 'body' | 'query' | 'params';

export const validate = (schema: ZodSchema, source: ValidationSource = 'body') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = req[source];
      const validated = await schema.parseAsync(data);

      // Replace the source with validated data
      req[source] = validated;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors: Record<string, string[]> = {};

        error.errors.forEach((err) => {
          const path = err.path.join('.');
          if (!errors[path]) {
            errors[path] = [];
          }
          errors[path].push(err.message);
        });

        res.status(400).json({
          success: false,
          error: 'Validation failed',
          errors,
        });
        return;
      }

      next(error);
    }
  };
};

// Validate multiple sources
export const validateMultiple = (schemas: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors: Record<string, string[]> = {};

      if (schemas.body) {
        try {
          req.body = await schemas.body.parseAsync(req.body);
        } catch (error) {
          if (error instanceof ZodError) {
            error.errors.forEach((err) => {
              const path = `body.${err.path.join('.')}`;
              if (!errors[path]) errors[path] = [];
              errors[path].push(err.message);
            });
          }
        }
      }

      if (schemas.query) {
        try {
          req.query = await schemas.query.parseAsync(req.query);
        } catch (error) {
          if (error instanceof ZodError) {
            error.errors.forEach((err) => {
              const path = `query.${err.path.join('.')}`;
              if (!errors[path]) errors[path] = [];
              errors[path].push(err.message);
            });
          }
        }
      }

      if (schemas.params) {
        try {
          req.params = await schemas.params.parseAsync(req.params);
        } catch (error) {
          if (error instanceof ZodError) {
            error.errors.forEach((err) => {
              const path = `params.${err.path.join('.')}`;
              if (!errors[path]) errors[path] = [];
              errors[path].push(err.message);
            });
          }
        }
      }

      if (Object.keys(errors).length > 0) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          errors,
        });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Sanitize string inputs
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .trim();
};

// Sanitize object recursively
export const sanitizeObject = (obj: any): any => {
  if (typeof obj === 'string') {
    return sanitizeInput(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const key of Object.keys(obj)) {
      sanitized[key] = sanitizeObject(obj[key]);
    }
    return sanitized;
  }

  return obj;
};

// Sanitization middleware
export const sanitize = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  next();
};
