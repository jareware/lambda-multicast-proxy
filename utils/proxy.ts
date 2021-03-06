import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { IncomingRequest, Headers } from './lambda';

export const DEFAULT_TIMEOUT = 10000;
export const NO_CACHING = {
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  Pragma: 'no-cache',
};

export interface ProxyResponse {
  data: any;
  status: number;
  statusText: string;
  headers: Headers;
}

export interface ProxyResponseMap {
  [outgoingUrl: string]: ProxyResponse;
}

export function proxyRequest(
  incomingRequest: IncomingRequest,
  outgoingUrls: string[],
  proxiedHeaders: string[] = [],
  timeoutAfter: number = DEFAULT_TIMEOUT,
  axiosOverride: AxiosInstance = axios,
): Promise<ProxyResponseMap> {
  return Promise.all(
    outgoingUrls.map(outgoingUrl =>
      axiosOverride
        .request({
          url: outgoingUrl,
          method: incomingRequest.requestMethod,
          data: incomingRequest.requestBody,
          headers: filterHeaders(
            {
              'X-Request-ID': incomingRequest.requestId,
              ...incomingRequest.requestHeaders,
            },
            proxiedHeaders,
          ),
          timeout: timeoutAfter,
        })
        .then(simplifyResponse)
        .catch(err => {
          // @see https://github.com/axios/axios#handling-errors
          if (err.response) return simplifyResponse(err.response); // The request was made and the server responded with a status code that falls out of the range of 2xx
          if (err.request) return errorResponse('Request Timed Out'); // The request was made but no response was received
          throw new Error(`Could not proxy request: ${err}`); // Something happened in setting up the request that triggered an Error
        })
        .then(result => ({ [outgoingUrl]: result })),
    ),
  ).then(results =>
    results.reduce((memo, next) => Object.assign(memo, next), {}),
  );
}

export function filterHeaders(
  headers: Headers,
  proxiedHeaders: string[],
): Headers {
  return Object.keys(headers)
    .map(key => [key, headers[key]])
    .reduce(
      (memo, next) => {
        const [key, val] = next;
        if (proxiedHeaders.indexOf(key.toLowerCase()) !== -1) {
          memo[key] = val;
        }
        return memo;
      },
      {} as Headers,
    );
}

function simplifyResponse(response: AxiosResponse): ProxyResponse {
  const { data, status, statusText, headers } = response;
  return { data, status, statusText, headers };
}

function errorResponse(statusText: string): ProxyResponse {
  return {
    data: null,
    status: 0,
    statusText,
    headers: {},
  };
}
