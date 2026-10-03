import next from "eslint-config-next";

const config = [
  ...next,
  { ignores: [".next/**", "node_modules/**", "scripts/**", "next-env.d.ts"] },
  {
    rules: {
      // Scroll/animation code intentionally reads refs and writes DOM in effects.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "react-hooks/immutability": "off",
    },
  },
];

export default config;
