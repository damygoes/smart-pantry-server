import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

interface LogMetadata {
  requestId?: string;
  method?: string;
  url?: string;
  headers?: any;
  body?: any;
  statusCode?: number;
  duration?: string;
  responseSize?: string;
  error?: string;
  stack?: string;
  timestamp?: string;
  userAgent?: string;
  ip?: string;
}

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(LoggerMiddleware.name);

  private filterSensitiveData(obj: any): any {
    const sensitiveFields = [
      'password',
      'token',
      'authorization',
      'cookie',
      'secret',
      'key',
      'apikey',
      'api-key',
      'credential',
    ];

    if (!obj) return obj;

    return Object.keys(obj).reduce((acc, key) => {
      if (sensitiveFields.some((field) => key.toLowerCase().includes(field))) {
        acc[key] = '[FILTERED]';
      } else if (typeof obj[key] === 'object') {
        acc[key] = this.filterSensitiveData(obj[key]);
      } else {
        acc[key] = obj[key];
      }
      return acc;
    }, {});
  }

  private getResponseSize(): (res: Response) => void {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let responseSize = 0;
    return (res: Response) => {
      const originalWrite = res.write;
      const originalEnd = res.end;

      res.write = function (chunk: any, ...args: any[]): boolean {
        if (chunk) {
          responseSize += chunk.length;
        }
        return originalWrite.apply(res, [chunk, ...args]);
      };

      res.end = function (chunk: any, ...args: any[]): Response {
        if (chunk) {
          responseSize += chunk.length;
        }
        return originalEnd.apply(res, [chunk, ...args]);
      };
    };
  }

  use(req: Request, res: Response, next: () => void) {
    const requestId = uuidv4();
    const startTime = process.hrtime();
    // Attach request ID to the request object for use in other middlewares/controllers
    req['requestId'] = requestId;

    // Setup response size tracking
    this.getResponseSize()(res);

    // Initial request logging
    const requestMetadata: LogMetadata = {
      requestId,
      method: req.method,
      url: req.originalUrl,
      headers: this.filterSensitiveData(req.headers),
      body: this.filterSensitiveData(req.body),
      timestamp: new Date().toISOString(),
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.socket.remoteAddress,
    };

    this.logger.log({
      message: 'Incoming request',
      ...requestMetadata,
    });

    // Handle response completion
    res.on('finish', () => {
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const duration = seconds * 1000 + nanoseconds / 1000000;

      const responseMetadata: LogMetadata = {
        ...requestMetadata,
        statusCode: res.statusCode,
        duration: `${duration.toFixed(2)}ms`,
        responseSize: res.hasHeader('content-length')
          ? `${res.getHeader('content-length')} bytes`
          : 'unknown',
      };

      // Log based on status code
      if (res.statusCode >= 500) {
        this.logger.error({
          message: 'Request failed',
          ...responseMetadata,
        });
      } else if (res.statusCode >= 400) {
        this.logger.warn({
          message: 'Request failed',
          ...responseMetadata,
        });
      } else {
        this.logger.log({
          message: 'Request completed',
          ...responseMetadata,
        });
      }
    });

    // Handle errors
    res.on('error', (error: Error) => {
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const duration = seconds * 1000 + nanoseconds / 1000000;

      this.logger.error({
        message: 'Request error',
        ...requestMetadata,
        error: error.message,
        stack: error.stack,
        duration: `${duration.toFixed(2)}ms`,
      });
    });

    // Set response header with request ID for client tracking
    res.setHeader('X-Request-ID', requestId);

    next();
  }
}
