

# MyPRs
### One link to highlight your Open-Source Contributions.
The 'link-in-bio' for your Open-Source PRs. Curate a selection of your proudest GitHub PRs, showcase your expertise, and set yourself apart in the crowd.

![MyPRs](https://www.myprs.xyz/assets/og-banner.png)
## Development

Copy `.env.example` to `.env.local` and fill in your Supabase / PostHog values
(and optionally a `GITHUB_TOKEN` to raise the GitHub API rate limit). Then:

```sh
# start the Next.js dev server
npm run dev
```

Open up [http://127.0.0.1:3000](http://127.0.0.1:3000) and you should be ready to go!

Other scripts: `npm run build` (production build), `npm start` (serve the
build), `npm run typecheck`, `npm run lint`.

## Deployment (Cloudflare Workers)

Deployed to Cloudflare Workers via [OpenNext](https://opennext.js.org/cloudflare).

```sh
npm run preview   # build + run the Workers bundle locally (uses .dev.vars)
npm run deploy    # build + deploy to Cloudflare
```

Set runtime vars as Worker secrets (`wrangler secret put NAME`) or in the
dashboard: the `NEXT_PUBLIC_*` values (also required at build time), plus
`GITHUB_TOKEN`. Config lives in `wrangler.jsonc` and `open-next.config.ts`.

> **Middleware note:** we use the `middleware.ts` (edge) convention rather than
> Next 16's new `proxy.ts`, because `proxy` runs on the Node.js runtime, which
> OpenNext Cloudflare does not yet support
> ([#962](https://github.com/opennextjs/opennextjs-cloudflare/issues/962)).

## Built with
Using the  awesome tools:
- @nextjs 16 (App Router — React Server Components, Server Actions)
- @cloudflare Workers (via OpenNext)
- @tailwindcss
- @vercel(the perfect place to deploy modern web apps. I tried all alternatives and finally chose Vercel)
- @shadcn (best way to build accessible web apps, by default)
- @supabase (auth via `@supabase/ssr`)


### ⚠️ Disclamer  : This is a work in progress. I am still working on it. Feel free to contribute.