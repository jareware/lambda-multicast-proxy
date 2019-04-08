import { IncomingRequest, LambdaResponse } from './lambda';
import { ProxyResponseMap } from './proxy';
import { connect, TLSSocket } from 'tls';
import { inspect } from 'util';
import { Config } from './config';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LoggerMethod = (message: string, meta?: any) => void;
export type Disposable = {
  dispose(): Promise<null>;
};
export type Logger = { [level in LogLevel]: LoggerMethod } & Disposable;

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
    dispose: () => Promise.resolve(null),
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
  const reqCount = urls.length;
  const okCount = urls
    .map(url => res[url].status)
    .filter(status => status >= 200 && status < 300).length;
  const nokCount = reqCount - okCount;
  const destination = `${request.requestMethod} ${request.requestPath}`;
  log.info(
    `${destination} => ${okCount}/${reqCount} OK` +
      (okCount !== reqCount ? ` + ${nokCount} NOT-OK` : ``),
  );
  if (urls.length) {
    urls.forEach(url => {
      log.debug(
        `Proxied: ${request.requestMethod} ${url} => ${res[url].status || ''} ${
          res[url].statusText
        }`,
        res[url],
      );
    });
  }
  if (outgoing) {
    log.debug('Outgoing response:', outgoing);
  }
}

export function createPapertrailLogger(
  papertrailHost: string,
  papertrailPort: number,
  hostName: string,
  appName: string,
  logLevel: LogLevel | null = 'debug',
): Logger {
  const socket = createPapertrailSocket(papertrailHost, papertrailPort);
  const bind = (currentLevel: LogLevel): LoggerMethod => {
    if (level(currentLevel) < level(logLevel)) return () => {};
    return (message, meta) => {
      socket.send(
        (message + (typeof meta === 'undefined' ? '' : '\n' + formatMeta(meta)))
          .split('\n')
          .map(line =>
            formatPapertrailLine(currentLevel, hostName, appName, line),
          )
          .join(''),
      );
    };
  };
  return {
    debug: bind('debug'),
    info: bind('info'),
    warn: bind('warn'),
    error: bind('error'),
    dispose: socket.close,
  };
}

function formatMeta(meta: any) {
  return inspect(meta, {
    showHidden: false,
    depth: 5,
    colors: true,
    customInspect: true,
    showProxy: false,
    maxArrayLength: 100,
    breakLength: 60,
    compact: true,
  } as any); // @types/node doesn't know of "compact"
}

// http://tools.ietf.org/html/rfc5424#section-6
const PAPERTRAIL_PRIVALS: { [level in LogLevel]: number } = {
  debug: 31,
  info: 30,
  warn: 28,
  error: 27,
};

function formatPapertrailLine(
  level: LogLevel,
  hostName: string,
  appName: string,
  line: string,
) {
  const prival = PAPERTRAIL_PRIVALS[level];
  const ts = new Date().toISOString();
  return `<${prival}>1 ${ts} ${hostName} ${appName} - - - [${level}] ${line}\n`;
}

// Creates a TLS socket connection to Papertrail.
function createPapertrailSocket(
  papertrailHost: string,
  papertrailPort: number,
  log = createConsoleLogger('warn'),
) {
  const start = connectToPapertrail();

  start
    .then(socket => {
      log.info('Connected to Papertrail');
      socket.setTimeout(60 * 1000);
      socket.on('timeout', () => socket.write('\n'));
    })
    .catch(err => log.error('Could not connect to Papertrail', err));

  return {
    // Sends given syslog-formatted data to Papertrail.
    send,

    // Closes the socket, and returns a Promise that resolves when all data has been sent,
    // or rejects if some data may have been lost due to e.g. connection loss.
    close,
  };

  function connectToPapertrail() {
    return new Promise<TLSSocket>((resolve, reject) => {
      const socket = connect({ host: papertrailHost, port: papertrailPort }); // https://nodejs.org/docs/latest-v8.x/api/tls.html#tls_tls_connect_options_callback
      socket.setKeepAlive(true);
      socket.once('secureConnect', () => resolve(socket));
      socket.once('error', reject);
    });
  }

  function send(data: string): void {
    log.debug('Sending data to Papertrail');
    start
      .then(socket =>
        socket.write(data + '\n', () => log.debug('Sent data to Papertrail')),
      )
      .catch(error =>
        log.error('Could not send data to Papertrail', { data, error }),
      );
  }

  function close(): Promise<null> {
    return start.then(socket => {
      log.debug('Papertrail socket is closing');
      socket.end();
      return new Promise<null>((resolve, reject) => {
        socket.once('close', hadTransmissionError => {
          if (hadTransmissionError) {
            const err = new Error(
              'Papertrail socket has closed, but not all data may have been sent',
            );
            log.warn(err.message);
            reject(err);
          } else {
            log.info('Papertrail socket has closed cleanly');
            resolve(null);
          }
        });
      });
    });
  }
}

export function getRequestLogger(
  config: Config,
  requestId: string,
  fallbackLogger: Logger,
): Logger {
  return config.papertrailHost && config.papertrailPort
    ? createPapertrailLogger(
        config.papertrailHost,
        config.papertrailPort,
        config.papertrailHostName || 'lambda-multicast-proxy',
        requestId,
        config.logLevel,
      )
    : fallbackLogger;
}
