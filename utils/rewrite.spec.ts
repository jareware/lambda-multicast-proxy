import 'mocha';
import { assert } from 'chai';
import { rewriteIncomingUrl } from './rewrite';

describe('utils/rewrite', () => {
  describe('rewriteIncomingUrl()', () => {
    const CONFIG = {
      '^/image-upload/(.*)': [
        'http://legacy.example.com/api/v1/image-upload/$1',
        'https://api.example.com/v2/upload',
      ],
      '^/status(.*)': [
        'http://legacy.example.com/api/v1/status$1',
        'https://api.example.com/v2/status$1',
      ],
    };

    it('works for the POST example', () => {
      assert.deepEqual(
        rewriteIncomingUrl(
          CONFIG,
          /* POST https://router.example.com */ '/image-upload/jpg',
        ),
        [
          /* POST */ 'http://legacy.example.com/api/v1/image-upload/jpg',
          /* POST */ 'https://api.example.com/v2/upload',
        ],
      );
    });

    it('works for the GET example', () => {
      assert.deepEqual(
        rewriteIncomingUrl(
          CONFIG,
          /* GET https://router.example.com */ '/status?id=123',
        ),
        [
          /* GET */ 'http://legacy.example.com/api/v1/status?id=123',
          /* GET */ 'https://api.example.com/v2/status?id=123',
        ],
      );
    });

    it('works for multiple matching patterns', () => {
      const config = {
        '^.*$': ['http://foo.com/'],
        '..*$': ['http://bar.com/'],
      };
      assert.deepEqual(rewriteIncomingUrl(config, '/whatever'), [
        'http://foo.com/',
        'http://bar.com/',
      ]);
    });
  });
});
