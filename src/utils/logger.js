(function () {
  const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
  const DEFAULT_LEVEL = (window.SYSTEM_BLOCKS_LOG_LEVEL || 'warn').toLowerCase();
  const GLOBAL_CONSOLE = typeof window !== 'undefined' ? window.console : undefined;

  let currentLevel = LEVELS[DEFAULT_LEVEL] !== undefined ? DEFAULT_LEVEL : 'warn';

  function shouldLog(level) {
    return LEVELS[level] >= LEVELS[currentLevel];
  }

  function safeConsoleCall(method, args) {
    if (!GLOBAL_CONSOLE) {
      return;
    }

    const target = typeof GLOBAL_CONSOLE[method] === 'function'
      ? GLOBAL_CONSOLE[method]
      : GLOBAL_CONSOLE && typeof GLOBAL_CONSOLE['log'] === 'function'
        ? GLOBAL_CONSOLE['log']
        : undefined;

    if (typeof target === 'function') {
      target.apply(GLOBAL_CONSOLE, args);
    }
  }

  function output(method, level, args) {
    if (!shouldLog(level)) {
      return;
    }

    safeConsoleCall(method, args);
  }

  function setLevel(newLevel) {
    const normalized = String(newLevel || '').toLowerCase();
    if (LEVELS[normalized] === undefined) {
      output('warn', 'warn', [`[Logger] Unknown log level: ${newLevel}`]);
      return;
    }

    currentLevel = normalized;
    output('info', 'info', [`[Logger] Level set to ${normalized}`]);
  }

  function createFallbackLogger() {
    return {
      debug: (...args) => safeConsoleCall('debug', args),
      info: (...args) => safeConsoleCall('info', args),
      warn: (...args) => safeConsoleCall('warn', args),
      error: (...args) => safeConsoleCall('error', args),
    };
  }

  const logger = {
    debug: (...args) => output('debug', 'debug', args),
    info: (...args) => output('info', 'info', args),
    warn: (...args) => output('warn', 'warn', args),
    error: (...args) => output('error', 'error', args),
    setLevel,
    getLevel: () => currentLevel,
  };

  if (!window.SystemBlocksLogger) {
    window.SystemBlocksLogger = logger;
  }

  window.getSystemBlocksLogger = function () {
    return window.SystemBlocksLogger || createFallbackLogger();
  };
})();
