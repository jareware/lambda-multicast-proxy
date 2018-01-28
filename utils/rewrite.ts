import { Config } from './config';

type RewriteConfig = Config['rewriteConfig'];

export function rewriteIncomingUrl(
  config: RewriteConfig,
  incomingUrl: string,
): string[] {
  return Object.keys(config)
    .map<[RegExp, string[]]>(pattern => [new RegExp(pattern), config[pattern]])
    .filter(([search]) => search.test(incomingUrl)) // only include patterns that match
    .map(([search, replaces]) =>
      replaces.map(replace => incomingUrl.replace(search, replace)),
    )
    .reduce((memo, next) => memo.concat(next), []); // i.e. flatten()
}
