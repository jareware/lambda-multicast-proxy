import { IncomingRequest, LambdaResponse } from './lambda';
import { ProxyResponseMap } from './proxy';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LoggerMethod = (message: string, meta?: any) => void;
export type Logger = { [level in LogLevel]: LoggerMethod };

export function createConsoleLogger(
  logLevel: LogLevel | null = 'debug',
): Logger {
  const bind = (currentLevel: LogLevel): LoggerMethod => {
    if (level(currentLevel) < level(logLevel)) return () => {};
    return (message, meta) => {
      const line = `[${currentLevel}] ${message}`;
      const args = typeof meta === 'undefined' ? [line] : [line + '\n', meta];
      console.log.apply(console, args);
    };
  };
  return {
    debug: bind('debug'),
    info: bind('info'),
    warn: bind('warn'),
    error: bind('error'),
  };
}

function level(level: LogLevel | null): number {
  if (level === 'debug') return 1;
  if (level === 'info') return 2;
  if (level === 'warn') return 3;
  if (level === 'error') return 4;
  if (level === null) return Infinity;
  return ((_: never) => {})(level) as any; // assert exhaustiveness
}

export function logProxiedRequest(
  urls: string[],
  log: Logger,
  request: IncomingRequest,
  res: ProxyResponseMap,
  outgoing?: LambdaResponse,
) {
  if (urls.length) {
    urls.forEach(url => {
      log.info(
        `${request.requestMethod} ${request.requestPath} => ${url} => ${res[url]
          .status || ''} ${res[url].statusText}`,
      );
    });
  } else {
    log.info(`${request.requestMethod} ${request.requestPath} => NO-OP`);
  }
  log.debug('Proxied request:', {
    incoming: request.requestPath,
    outgoing: res,
  });
  if (outgoing) {
    log.debug('Outgoing response:', { outgoing });
  }
}
