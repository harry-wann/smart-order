/** @type {import("prettier").Config & import("prettier-plugin-tailwindcss").PluginOptions} */
export default {
  plugins: ["prettier-plugin-tailwindcss"],

  // Tailwind CSS v4 的 CSS 入口
  tailwindStylesheet: "./src/style.css",

  // 以下是常見格式偏好，可自行調整
  singleQuote: true,
  semi: false,
  trailingComma: "all",
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  endOfLine: "lf",
};
