# What Would You Put a Bounty On?

[![make.fun](https://make.fun/badge/post-x-promote-make-your-own-bounty-01.svg)](https://make.fun/bounty/post-x-promote-make-your-own-bounty-01)
[![Rank](https://make.fun/badge/post-x-promote-make-your-own-bounty-01/dentybaiq/post-x-promote-make-your-own-bounty-01/rank.svg)](https://make.fun/bounty/post-x-promote-make-your-own-bounty-01)
[![Reward](https://make.fun/badge/post-x-promote-make-your-own-bounty-01/dentybaiq/post-x-promote-make-your-own-bounty-01/reward.svg)](https://make.fun/bounty/post-x-promote-make-your-own-bounty-01)

Entry for the [make.fun bounty "Promote make.fun's make-your-own-bounty post on X"](https://make.fun/bounty/post-x-promote-make-your-own-bounty-01) ($250, 50 winners).

The entry is one public X post from [@dentybaiq](https://x.com/dentybaiq) — a quote-post of [make.fun's post](https://x.com/makefunai/status/2124915864336236646) with an original promo image attached. Score is replies + reposts + quotes, so the post is built around one thing: an open question that invites everyone to reply with the bounty *they* would launch.

## The post

> If you could put a bounty on ANYTHING — a bug, a game, a song, a wild idea — what would it be? Reply below 👇
> Make your own bounty on @makefunai: https://make.fun/sponsor/new
> Play code: hvjtrkxx

194 characters (189 X-weighted — the 👇 counts as 2, and the URL counts as 23) — well inside the 280 limit. It quotes the make.fun post, tags @makefunai, links make.fun, and carries play code `hvjtrkxx`.

## Files

- `main.ts` — the entry program (Node 22, stdlib only, no network): holds the post draft, validates every bounty requirement (quote/link, @makefunai tag, play code, character count, attached photo), and writes `post-validated.json`.
- `POST.json` — the post's address on X (filled in after the post is published) plus the quoted post URL and account.
- `post-photo.png` — the original promo image attached to the post (1600×900, drawn in code).

## Run it

```sh
node main.ts
```

Exits 0 when the post is valid; writes the full check-by-check report to `post-validated.json`.
