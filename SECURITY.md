# Security Policy

## Reporting a vulnerability

Please **do not** open a public issue for crawler bypasses, SSRF, or other security bugs.

Email the maintainers described in the GitHub repository security advisory flow, or open a private security advisory on GitHub.

Include:

- Affected version / commit
- A minimal proof of the crawler reaching a disallowed target, or another impact
- Whether you plan to disclose on a timeline

## What AgentLens will fetch

AgentLens is a crawler. It is designed to fetch **public** `http:` and `https:` URLs only.

It must not fetch:

- `localhost`, loopback, or unspecified addresses
- Private IPv4/IPv6 ranges, link-local, or unique-local addresses
- Cloud metadata endpoints
- URLs with embedded credentials
- Redirect hops that resolve to any of the above

Limits (defaults):

| Limit | Default |
| --- | --- |
| Timeout | 10s |
| Response size | 2 MiB |
| Redirects | 5 |
| Extra pages | 0 (homepage + well-known files only) |
| Extra page cap | 50 |
| Concurrency | 3 |

See [docs/security.md](docs/security.md).
