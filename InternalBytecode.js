/**
 * Stub file added to satisfy Metro symbolication on Hermes stack traces.
 * Hermes sometimes reports frames from "InternalBytecode.js" which Metro then
 * tries to read from disk during stack trace symbolication. When the file does
 * not exist, Metro throws ENOENT and the development server stops symbolication.
 *
 * Keeping this file present avoids noisy ENOENT errors in development. The file
 * is intentionally empty except for this comment; it is never imported at runtime.
 */
export default {};

