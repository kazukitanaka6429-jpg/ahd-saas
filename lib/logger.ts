/**
 * Structured Logger using console.log/error
 * Outputs logs in JSON format for easy parsing and ingestion.
 */

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogPayload {
    timestamp: string;
    level: LogLevel;
    message: string;
    context?: Record<string, any>;
}

export const logger = {
    log: (level: LogLevel, message: string, context?: Record<string, any>) => {
        const timestamp = new Date().toISOString();
        const payload: LogPayload = {
            timestamp,
            level,
            message,
            context,
        };

        const logString = JSON.stringify(payload);

        // In development, you might want pretty printing, but sticking to JSON for consistency
        if (level === 'error') {
            console.error(logString);
        } else if (level === 'warn') {
            console.warn(logString);
        } else {
            console.log(logString);
        }
    },

    info: (message: string, context?: Record<string, any>) => {
        logger.log('info', message, context);
    },

    warn: (message: string, context?: Record<string, any>) => {
        logger.log('warn', message, context);
    },

    error: (message: string, error?: any, context?: Record<string, any>) => {
        // If an Error object is passed (common pattern), merge it into context
        const errorContext = error instanceof Error
            ? { name: error.name, message: error.message, stack: error.stack, ...context }
            : { error, ...context };

        logger.log('error', message, errorContext);
    },

    debug: (message: string, context?: Record<string, any>) => {
        // Only log debug in non-production or if explicitly enabled
        if (process.env.NODE_ENV !== 'production' || process.env.LOG_LEVEL === 'debug') {
            logger.log('debug', message, context);
        }
    },
};
