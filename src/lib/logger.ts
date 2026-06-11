type LogArgs = Parameters<typeof console.log>;

const isDevelopment = process.env.NODE_ENV === "development";
// Allow enabling verbose logs in production via LOG_LEVEL=debug for troubleshooting.
const isVerbose = isDevelopment || process.env.LOG_LEVEL === "debug";

export const logger = {
  debug(...args: LogArgs) {
    if (isVerbose) {
      console.debug(...args);
    }
  },
  info(...args: LogArgs) {
    if (isVerbose) {
      console.info(...args);
    }
  },
  warn(...args: LogArgs) {
    console.warn(...args);
  },
  error(...args: LogArgs) {
    console.error(...args);
  },
};
