import { type RouteConfig, index, route, layout, prefix } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),
  route("auth/callback", "routes/auth.callback.tsx"),
  route("stream", "routes/stream.tsx"),
  route("actions/toggle-theme", "routes/actions.toggle-theme.tsx"),
  route("actions/toggle-featured", "routes/actions.toggle-featured.tsx"),
  route("api/:username", "routes/api.$username.tsx"),
  route("api/:username/og", "routes/api.$username.og.tsx"),
  route(":username", "routes/$username.tsx"),
] satisfies RouteConfig;