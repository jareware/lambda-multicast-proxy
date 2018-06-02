import 'mocha';
import { assert } from 'chai';
import { parseConfig } from './config';
import { DEFAULT_TIMEOUT } from './proxy';

describe('utils/config', () => {
  describe('parseConfig()', () => {
    it('returns default config if nothing provided', () => {
      assert.deepEqual(parseConfig(null), {
        logLevel: 'debug',
        papertrailHost: null,
        papertrailPort: null,
        papertrailHostName: null,
        proxyTimeout: DEFAULT_TIMEOUT,
        rewriteConfig: {},
        proxiedIncomingHeaders: [],
        proxiedOutgoingHeaders: [],
      });
    });
    it('keeps config when provided', () => {
      assert.deepEqual(
        parseConfig({
          logLevel: 'debug',
          papertrailHost: 'hostname',
          papertrailPort: 1337,
          papertrailHostName: 'MyRouter',
          proxyTimeout: 123,
          rewriteConfig: {
            '^test': ['http://example.com'],
          },
          proxiedIncomingHeaders: ['foo'],
          proxiedOutgoingHeaders: ['bar'],
        }),
        {
          logLevel: 'debug',
          papertrailHost: 'hostname',
          papertrailPort: 1337,
          papertrailHostName: 'MyRouter',
          proxyTimeout: 123,
          rewriteConfig: {
            '^test': ['http://example.com'],
          },
          proxiedIncomingHeaders: ['foo'],
          proxiedOutgoingHeaders: ['bar'],
        },
      );
    });
    it('replaces invalid config with defaults', () => {
      assert.deepEqual(
        parseConfig({
          logLevel: 123,
          papertrailHost: 1337,
          papertrailPort: 'hostname',
          papertrailHostName: 123,
          rewriteConfig: {
            '^test': [123],
          },
          proxiedIncomingHeaders: [123],
          proxiedOutgoingHeaders: false,
        }),
        {
          logLevel: 'debug',
          papertrailHost: null,
          papertrailPort: null,
          papertrailHostName: null,
          proxyTimeout: DEFAULT_TIMEOUT,
          rewriteConfig: {},
          proxiedIncomingHeaders: [],
          proxiedOutgoingHeaders: [],
        },
      );
    });
    it('parses config from JSON string', () => {
      assert.deepEqual(
        parseConfig(
          JSON.stringify({
            logLevel: 'debug',
            proxiedIncomingHeaders: ['foo'],
          }),
        ),
        {
          logLevel: 'debug',
          papertrailHost: null,
          papertrailPort: null,
          papertrailHostName: null,
          proxyTimeout: DEFAULT_TIMEOUT,
          rewriteConfig: {},
          proxiedIncomingHeaders: ['foo'],
          proxiedOutgoingHeaders: [],
        },
      );
    });
  });
});
