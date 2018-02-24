// This config file is designed to be compatible with the official AWS CLI:
// $ aws lambda update-function-configuration \
//     --function-name MyLambdaFunction \
//     --environment $(node -p 'require("./demo-config")')
// For more information, see: https://github.com/jareware/lambda-multicast
module.exports = JSON.stringify({

  Variables: {

    LAMBDA_MULTICAST_CONFIG: JSON.stringify({

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

    })

  }

});
