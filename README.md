

# MyPRs
### One link to highlight your Open-Source Contributions.
The 'link-in-bio' for your Open-Source PRs. Curate a selection of your proudest GitHub PRs, showcase your expertise, and set yourself apart in the crowd.

![MyPRs](https://www.myprs.dev/assets/og-banner.png)
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

## Deployment (Vercel)

Deploys to Vercel with zero config — it detects Next.js automatically. Set the
environment variables from `.env.example` in the Vercel project settings
(`NEXT_PUBLIC_*` plus `GITHUB_TOKEN`).

## Built with
Using the  awesome tools:
- @nextjs 16 (App Router — React Server Components, Server Actions)
- @tailwindcss
- @vercel(the perfect place to deploy modern web apps. I tried all alternatives and finally chose Vercel)
- @shadcn (best way to build accessible web apps, by default)
- @supabase (auth via `@supabase/ssr`)


### ⚠️ Disclamer  : This is a work in progress. I am still working on it. Feel free to contribute.