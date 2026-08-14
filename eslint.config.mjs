import next from "eslint-config-next/core-web-vitals";

// eslint-config-next v16 ships native flat config (an array), so spread it
// directly — no FlatCompat bridge needed.
const config = [
  ...next,
  {
    rules: {
      // Content strings contain intentional apostrophes/quotes.
      "react/no-unescaped-entities": "off",
    },
  },
  { ignores: [".next/**", "node_modules/**"] },
];

export default config;
