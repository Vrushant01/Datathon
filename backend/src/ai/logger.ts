export const aiLogger = {
  info: (message: string, meta?: any) => {
    console.log(`[AI-INFO] ${message}`, meta ? meta : '');
  },
  warn: (message: string, meta?: any) => {
    console.warn(`[AI-WARN] ${message}`, meta ? meta : '');
  },
  error: (message: string, meta?: any) => {
    console.error(`[AI-ERROR] ${message}`, meta ? meta : '');
  },
  logQuery: (question: string, durationMs: number, collections: string[], hasError: boolean = false) => {
    console.log(`[AI-QUERY] Question: "${question}" | Duration: ${durationMs}ms | Collections: ${collections.join(',')} | Status: ${hasError ? 'ERROR' : 'SUCCESS'}`);
  }
};
