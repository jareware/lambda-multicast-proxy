import { stringify } from 'querystring';

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
