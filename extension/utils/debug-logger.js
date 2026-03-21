'use strict';

// PostureGuard — Debug Logger
// Centralized logging with prefix and optional debug mode toggle.

const DEBUG_ENABLED = false;
const LOG_PREFIX = '[PostureGuard]';

const Logger = {
  info: (...args) => console.log(LOG_PREFIX, ...args),
  warn: (...args) => console.warn(LOG_PREFIX, ...args),
  error: (...args) => console.error(LOG_PREFIX, ...args),
  debug: (...args) => {
    if (DEBUG_ENABLED) console.debug(LOG_PREFIX, ...args);
  }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.PostureLogger = Logger;
}
