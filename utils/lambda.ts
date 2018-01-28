export interface Headers {
  [header: string]: string;
}

export interface IncomingRequest {
  requestId: string;
  requestMethod: string;
  requestPath: string;
  requestParams: { [param: string]: string };
  requestHeaders: Headers;
  requestBody: object | string;
}

// Note: This assumes a request pipeline of CloudFront -> API Gateway -> Lambda
export function normalizeIncomingRequest(event: any): IncomingRequest {
  return {
    requestId: event.requestContext.requestId,
    requestMethod: event.httpMethod,
    requestPath: event.path,
    requestParams: event.queryStringParameters || {},
    requestHeaders: event.headers || {},
    requestBody: event.body,
  };
}
