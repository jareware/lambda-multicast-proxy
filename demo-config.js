// This file can be easily serialized with:
// $ node -p 'JSON.stringify(require("./demo-config"))'
module.exports = {

  logLevel: 'debug',

  proxyTimeout: 5000,

  rewriteConfig: {

    '^/image-upload/(.*)': [
      'http://legacy.example.com/api/v1/image-upload/$1',
      'https://api.example.com/v2/upload',
    ],

    '^/status(.*)': [
      'http://legacy.example.com/api/v1/status$1',
      'https://api.example.com/v2/status$1',
    ],

  },

  proxiedIncomingHeaders: [
    'authorization',
    'content-type',
    'user-agent',
    'x-request-id',
  ],

  proxiedOutgoingHeaders: [
    'content-type',
  ],

};
