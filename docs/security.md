# Crawler security

AgentLens fetches untrusted URLs. Treat every URL as hostile.

## Allowed

- `http:`
- `https:`

## Blocked

- `localhost`, `*.localhost`, `*.local`, `*.internal`, `*.lan`
- `127.0.0.1/8`, `0.0.0.0/8`, `::1`
- Private IPv4 (`10/8`, `172.16/12`, `192.168/16`)
- Link-local (`169.254/16`, `fe80::/10`)
- CGNAT (`100.64/10`)
- Unique local IPv6 (`fc00::/7`)
- IPv4-mapped IPv6 forms of the above
- Cloud metadata hostnames (`metadata.google.internal`, `169.254.169.254`)
- Userinfo (`https://user:pass@host`)
- Non-network protocols (`file:`, `ftp:`, `javascript:`)

DNS is resolved before fetch. If any record is private or reserved, the request is refused.

Redirects are followed manually. Each `Location` is normalized and checked again, including redirect-to-private-IP.

## Limits

| Limit | Default | Notes |
| --- | --- | --- |
| Timeout | 10 000 ms | AbortController |
| Max response size | 2 MiB | Measured after decompression |
| Max redirects | 5 | Infinite redirect protection |
| Extra pages | 0 | Homepage + well-known files only |
| Max extra pages | 50 | Action/CLI `--pages` |
| Concurrency | 3 | Extra pages only |

Well-known files always considered (not a full-site crawl):

- `/robots.txt`
- `/sitemap.xml` (or sitemap declared in robots.txt)
- `/llms.txt`
- `/llms-full.txt`

Additional pages, if requested, stay same-origin and respect robots.txt `Allow`/`Disallow` for the AgentLens user-agent where rules can be parsed.

## HTML

Cheerio parses HTML. Analyzer rules must not `eval` page JavaScript.
