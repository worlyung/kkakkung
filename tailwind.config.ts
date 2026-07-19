import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: { DEFAULT: "#FFFDF9", 2: "#F6EFE4" },
        ink: { DEFAULT: "#3A2E28", soft: "#77675B" },
        apricot: { DEFAULT: "#E8894C", deep: "#B45F2A", soft: "#FBE6D2" },
        sage: { DEFAULT: "#7E9C88", deep: "#4E6B58", soft: "#E8EFE7" },
        line: "#F1E8DB",
      },
      boxShadow: {
        soft: "0 16px 38px rgba(90, 60, 40, 0.10)",
      },
    },
  },
  plugins: [],
};

export default config;
