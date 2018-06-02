declare var lambda: LambdaHandlers;

import {
  createConsoleLogger,
  logProxiedRequest,
  getRequestLogger,
} from './utils/logging';
import { parseConfig } from './utils/config';
import {
  normalizeIncomingRequest,
  LambdaHandlers,
  responseToLambda,
} from './utils/lambda';
import { rewriteIncomingUrl } from './utils/rewrite';
import { proxyRequest, NO_CACHING } from './utils/proxy';

const log = createConsoleLogger();
const config = parseConfig(process.env.LAMBDA_MULTICAST_CONFIG);

log.info('Lambda Multicast Proxy started');
log.debug('Current config:', config);
log.debug('Current env:', process.env);

lambda.handler = (event, context, callback) => {
  const reqLog = getRequestLogger(config, event.requestContext.requestId, log);
  reqLog.debug('Incoming request:', { event, context });

  const request = normalizeIncomingRequest(event);
  const urls = rewriteIncomingUrl(config.rewriteConfig, request.requestPath);

  proxyRequest(
    request,
    urls,
    config.proxiedIncomingHeaders,
    config.proxyTimeout,
  )
    .then(
      res => {
        if (urls.length) {
          // there was at least one proxy request generated
          const outgoing = responseToLambda(res[urls[0]], config);
          logProxiedRequest(urls, reqLog, request, res, outgoing);
          callback(null, outgoing);
        } else {
          // no rewrite config matched
          logProxiedRequest(urls, reqLog, request, res);
          callback(null, {
            statusCode: 200,
            headers: NO_CACHING,
          });
        }
      },
      err => {
        reqLog.warn('Proxying request failed', err);
        callback(null, { statusCode: 500, headers: NO_CACHING });
      },
    )
    .then(() => {
      return reqLog.dispose().catch(() => {});
    });
};
