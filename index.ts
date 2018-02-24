declare var lambda: any;

import { createConsoleLogger } from './utils/logging';
import { parseConfig } from './utils/config';
import { normalizeIncomingRequest } from './utils/lambda';
import { rewriteIncomingUrl } from './utils/rewrite';
import { proxyRequest, filterHeaders } from './utils/proxy';

const log = createConsoleLogger();
const config = parseConfig(process.env.LAMBDA_MULTICAST_CONFIG);

log.info('Lambda Multicast instance started');
log.debug('Configuration and environment are:', { config, env: process.env });

lambda.handler = (event: any, context: any, callback: any) => {
  log.debug('Incoming request:', { event, context });

  const request = normalizeIncomingRequest(event);
  const urls = rewriteIncomingUrl(config.rewriteConfig, request.requestPath);

  proxyRequest(
    request,
    urls,
    config.proxiedIncomingHeaders,
    config.proxyTimeout,
  ).then(
    res => {
      if (urls.length) {
        urls.forEach(url => {
          log.info(
            `${request.requestMethod} ${request.requestPath} => ${url} => ${res[
              url
            ].status || ''} ${res[url].statusText}`,
          );
        });
      } else {
        log.info(`${request.requestMethod} ${request.requestPath} => NO-OP`);
      }
      log.debug('Proxied request:', {
        incoming: request.requestPath,
        outgoing: res,
      });
      if (urls.length) {
        const primary = res[urls[0]];
        const outgoing = {
          statusCode: primary.status,
          body: primary.data,
          isBase64Encoded: false,
          headers: filterHeaders(primary.headers, ['content-type']),
        };
        log.debug('Outgoing response:', { outgoing });
        callback(null, outgoing);
      } else {
        callback(null, { statusCode: 200 });
      }
    },
    err => {
      log.warn('Proxying request failed', err);
      callback(null, { statusCode: 500 });
    },
  );
};
