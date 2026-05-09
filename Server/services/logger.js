/**
 * Centralized logger with structured logging, request correlation, and production-ready configuration.
 */
import pino from "pino";
import { v4 as uuidv4 } from 'uuid';
import os from 'os';

const isProd = process.env.NODE_ENV === "production";
const serviceName = process.env.SERVICE_NAME || "chainforge-api";
const serviceVersion = process.env.SERVICE_VERSION || "2.0.0";

// Create a base logger with service metadata
const baseConfig = {
  level: process.env.LOG_LEVEL || (isProd ? "info" : "debug"),
  formatters: {
    level: (label) => ({ level: label }),
    log: (object) => ({
      ...object,
      service: serviceName,
      version: serviceVersion,
      timestamp: new Date().toISOString(),
      pid: process.pid,
      hostname: os.hostname(),
    })
  },
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },
  // Add redaction for sensitive data
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      'req.body.passwordHash',
      'req.body.token',
      'req.body.apiKey',
      'req.body.secret',
      'user.passwordHash',
      'user.sessionToken',
      'config.jwtSecret',
      'config.mongodbUri',
      'env.REDIS_URL',
      'env.JWT_SECRET',
      'env.MONGODB_URI',
    ],
    censor: '[REDACTED]'
  }
};

// Development logger with pretty printing
const devLogger = pino({
  ...baseConfig,
  transport: {
    target: "pino-pretty",
    options: { 
      colorize: true, 
      translateTime: "SYS:standard",
      messageFormat: "{reqId} [{level}] {msg}",
    },
  },
});

// Production logger with JSON output
const prodLogger = pino({
  ...baseConfig,
  // Add additional production-specific configuration
  base: {
    pid: process.pid,
    hostname: os.hostname(),
    service: serviceName,
    version: serviceVersion,
  },
});

export const logger = isProd ? prodLogger : devLogger;

// Request context logger factory
export function createRequestLogger(req) {
  const requestId = req.headers['x-request-id'] || uuidv4();
  const userId = req.user?.sub || 'anonymous';
  
  return logger.child({
    requestId,
    userId,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection?.remoteAddress,
  });
}

// Background task logger factory
export function createTaskLogger(taskName, taskId = uuidv4()) {
  return logger.child({
    taskId,
    taskName,
    type: 'background',
  });
}

// Security event logger
export const securityLogger = logger.child({
  component: 'security',
  type: 'security-event',
});

// Performance logger
export const perfLogger = logger.child({
  component: 'performance',
  type: 'perf-event',
});

// Database operation logger
export const dbLogger = logger.child({
  component: 'database',
  type: 'db-operation',
});

// API request/response logger middleware
export function requestLogger(req, res, next) {
  const start = Date.now();
  const requestLogger = createRequestLogger(req);
  
  requestLogger.info('Request started', {
    query: req.query,
    params: req.params,
    // Don't log body in production for security/performance
    ...(process.env.NODE_ENV !== 'production' && { body: req.body })
  });
  
  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - start;
    
    requestLogger.info('Request completed', {
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length'),
      // Performance categorization
      performance: duration < 100 ? 'fast' : duration < 500 ? 'normal' : 'slow'
    });
    
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
}

// Error logging utility
export function logError(error, context = {}) {
  const errorLogger = logger.child({
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code,
    },
    ...context
  });
  
  if (error.statusCode >= 500) {
    errorLogger.error('Server error occurred');
  } else if (error.statusCode >= 400) {
    errorLogger.warn('Client error occurred');
  } else {
    errorLogger.info('Error occurred');
  }
}

// Performance monitoring utility
export function logPerformance(operation, duration, metadata = {}) {
  perfLogger.info('Performance metric', {
    operation,
    duration: `${duration}ms`,
    performance: duration < 100 ? 'excellent' : duration < 500 ? 'good' : duration < 1000 ? 'acceptable' : 'poor',
    ...metadata
  });
}

// Security event logging utility
export function logSecurityEvent(event, details = {}) {
  securityLogger.warn('Security event', {
    event,
    timestamp: new Date().toISOString(),
    severity: getSecuritySeverity(event),
    ...details
  });
}

function getSecuritySeverity(event) {
  const highSeverityEvents = ['login_failure', 'unauthorized_access', 'rate_limit_exceeded', 'suspicious_activity'];
  const mediumSeverityEvents = ['password_reset', 'api_key_generated', 'wallet_linked'];
  
  if (highSeverityEvents.includes(event)) return 'high';
  if (mediumSeverityEvents.includes(event)) return 'medium';
  return 'low';
}

// Health check logger
export const healthLogger = logger.child({
  component: 'health',
  type: 'health-check',
});

export default logger;

