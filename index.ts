declare var lambda: LambdaHandlers;

import { createConsoleLogger, logProxiedRequest } from './utils/logging';
import { parseConfig } from './utils/config';
import { normalizeIncomingRequest, LambdaHandlers } from './utils/lambda';
import { rewriteIncomingUrl } from './utils/rewrite';
import { proxyRequest, filterHeaders } from './utils/proxy';

const log = createConsoleLogger();
const config = parseConfig(process.env.LAMBDA_MULTICAST_CONFIG);

log.info('Lambda Multicast instance started');
log.debug('Configuration and environment are:', { config, env: process.env });

lambda.handler = (event, context, callback) => {
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
        // there was at least one proxy request generated
        const primary = res[urls[0]];
        const outgoing = {
          statusCode: primary.status,
          body: primary.data,
          isBase64Encoded: false,
          headers: filterHeaders(primary.headers, ['content-type']),
        };
        logProxiedRequest(urls, log, request, res, outgoing);
        callback(null, outgoing);
      } else {
        // no rewrite config matched
        logProxiedRequest(urls, log, request, res);
        callback(null, { statusCode: 200 });
      }
    },
    err => {
      log.warn('Proxying request failed', err);
      callback(null, { statusCode: 500 });
    },
  );
};
