export interface Logger {
  info(message: string): void;
  success(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  verbose(message: string): void;
}

export function createLogger(options: {
  verbose?: boolean;
  quiet?: boolean;
}): Logger {
  const { verbose = false, quiet = false } = options;

  return {
    info(message: string) {
      if (!quiet) {
        console.log(`[m2s] ${message}`);
      }
    },

    success(message: string) {
      if (!quiet) {
        console.log(`[m2s] ✓ ${message}`);
      }
    },

    warn(message: string) {
      if (!quiet) {
        console.warn(`[m2s] ⚠ ${message}`);
      }
    },

    error(message: string) {
      console.error(`[m2s] ✗ ${message}`);
    },

    verbose(message: string) {
      if (verbose && !quiet) {
        console.log(`[m2s]   ${message}`);
      }
    },
  };
}

// Default logger instance
let defaultLogger: Logger = createLogger({});

export function setDefaultLogger(logger: Logger): void {
  defaultLogger = logger;
}

export function getLogger(): Logger {
  return defaultLogger;
}
