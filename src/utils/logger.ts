type LogContext = Record<string, unknown>;

const isProduction = process.env.NODE_ENV === "production";

const formatContext = (context?: LogContext) =>
  context && Object.keys(context).length > 0 ? ` ${JSON.stringify(context)}` : "";

export const logger = {
  error(message: string, error?: unknown, context?: LogContext) {
    if (isProduction) {
      return;
    }

    const errorMessage = error instanceof Error ? error.message : String(error ?? "");
    process.stderr.write(`[error] ${message}${formatContext(context)} ${errorMessage}\n`);
  },
  info(message: string, context?: LogContext) {
    if (isProduction) {
      return;
    }

    process.stdout.write(`[info] ${message}${formatContext(context)}\n`);
  },
};
