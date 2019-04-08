import { stringify } from 'querystring';
import { ProxyResponse, filterHeaders } from './proxy';
import { Config } from './config';

export interface Headers {
  [header: string]: string;
}

export interface IncomingRequest {
  requestId: string;
  requestMethod: string;
  requestPath: string;
  requestHeaders: Headers;
  requestBody: object | string;
}

// @see https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-output-format
export interface LambdaResponse {
  statusCode: number;
  body?: string;
  isBase64Encoded?: boolean;
  headers?: Headers;
}

export interface LambdaHandlers {
  handler: (
    event: any,
    context: any,
    callback: (error: Error | null, response: LambdaResponse) => void,
  ) => void;
}

// Note: This assumes a request pipeline of CloudFront -> API Gateway -> Lambda
export function normalizeIncomingRequest(event: any): IncomingRequest {
  const query = stringify(event.queryStringParameters);
  return {
    requestId: event.requestContext.requestId,
    requestMethod: event.httpMethod,
    requestPath: event.path + (query ? `?${query}` : ''),
    requestHeaders: event.headers || {},
    requestBody: event.body,
  };
}

export function responseToLambda(
  primary: ProxyResponse,
  config: Config,
): LambdaResponse {
  return {
    statusCode: primary.status,
    body:
      typeof primary.data === 'string'
        ? primary.data
        : JSON.stringify(primary.data),
    isBase64Encoded: false,
    headers: {
      ...filterHeaders(primary.headers, config.proxiedOutgoingHeaders),
      ...config.additionalOutgoingHeaders,
    },
  };
}
