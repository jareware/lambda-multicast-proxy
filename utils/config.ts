import { LogLevel } from './logging';
import { DEFAULT_TIMEOUT } from './proxy';

export interface Config {
  logLevel: LogLevel | null;
  proxyTimeout: number;
  rewriteConfig: {
    [incomingUrlPattern: string]: string[];
  };
  proxiedIncomingHeaders: string[];
  proxiedOutgoingHeaders: string[];
}

export function parseConfig(rawConfig: any): Config {
  let c = rawConfig;
  if (typeof rawConfig === 'string') c = JSON.parse(rawConfig);
  const logLevel =
    c && (c.logLevel === null || typeof c.logLevel === 'string')
      ? c.logLevel
      : 'debug';
  const proxyTimeout =
    c && typeof c.proxyTimeout === 'number' ? c.proxyTimeout : DEFAULT_TIMEOUT;
  const rewriteConfig =
    c &&
    typeof c.rewriteConfig === 'object' &&
    Object.keys(c.rewriteConfig).reduce(
      (memo, next) =>
        memo &&
        Array.isArray(c.rewriteConfig[next]) &&
        c.rewriteConfig[next].reduce(
          (memo: boolean, next: any) => memo && typeof next === 'string',
          true,
        ),
      true,
    )
      ? c.rewriteConfig
      : {};
  const proxiedIncomingHeaders =
    c &&
    Array.isArray(c.proxiedIncomingHeaders) &&
    c.proxiedIncomingHeaders.reduce(
      (memo: boolean, next: any) => memo && typeof next === 'string',
      true,
    )
      ? c.proxiedIncomingHeaders
      : [];
  const proxiedOutgoingHeaders =
    c &&
    Array.isArray(c.proxiedOutgoingHeaders) &&
    c.proxiedOutgoingHeaders.reduce(
      (memo: boolean, next: any) => memo && typeof next === 'string',
      true,
    )
      ? c.proxiedOutgoingHeaders
      : [];
  return {
    logLevel,
    proxyTimeout,
    rewriteConfig,
    proxiedIncomingHeaders,
    proxiedOutgoingHeaders,
  };
}
