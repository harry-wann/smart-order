// ═══════════════════════════════════════════════════════════
// 格式化規則（JS / JSX / TS / TSX）
//
// 為什麼不用 Prettier：Prettier 會整份重排，沒有選項可以保留
// 「自己打的換行」「空行」「註解前用來對齊的空白」。
// 這份改用 @stylistic 的規則：只修下面有列出來的項目，沒列的一律不動。
//
// 誰會讀這份：
//   - npm run format / npm run format:check（只跑格式規則，不含 lint）
//   - oxlint.editor.config.ts（VS Code 存檔時用，會再加上 lint 規則）
// npm run lint 與 CI 讀的是 .oxlintrc.json，不受這份影響。
//
// 注意：oxlint 的 jsPlugins 還在 alpha，升級 oxlint 後若存檔不再格式化，先查這裡
// ═══════════════════════════════════════════════════════════
import { defineConfig } from 'oxlint'

export default defineConfig({
  // 關掉 oxlint 內建的檢查，這份只負責格式
  plugins: [],
  categories: { correctness: 'off' },

  jsPlugins: ['@stylistic/eslint-plugin', 'eslint-plugin-better-tailwindcss'],

  settings: {
    'better-tailwindcss': {
      // 寫成絕對路徑：從 smart_order 根目錄開啟時，工作目錄不是 frontend/，
      // 用相對路徑會找不到 tailwindcss 與 CSS 入口，class 排序就會錯
      cwd: import.meta.dirname,
      // Tailwind CSS v4 的 CSS 入口
      entryPoint: 'src/style.css',
    },
  },

  rules: {
    // ── 縮排 ──────────────────────────────────────────────────
    '@stylistic/indent': ['warn', 2, { SwitchCase: 1, offsetTernaryExpressions: true }],
    '@stylistic/jsx-indent-props': ['warn', 2],

    // ── 引號／分號／逗號 ───────────────────────────────────────
    '@stylistic/quotes': ['warn', 'single', { avoidEscape: true, allowTemplateLiterals: 'always' }],
    '@stylistic/jsx-quotes': ['warn', 'prefer-double'],
    '@stylistic/semi': ['warn', 'never'],
    '@stylistic/comma-dangle': ['warn', 'always-multiline'],
    '@stylistic/arrow-parens': ['warn', 'always'],

    // ── 行內空白 ──────────────────────────────────────────────
    // ignoreEOLComments：行尾註解前面的空白不動，才能用空白把註解對齊
    '@stylistic/no-multi-spaces': ['warn', { ignoreEOLComments: true }],
    '@stylistic/object-curly-spacing': ['warn', 'always'],
    '@stylistic/array-bracket-spacing': ['warn', 'never'],
    '@stylistic/comma-spacing': 'warn',
    '@stylistic/key-spacing': 'warn',
    '@stylistic/keyword-spacing': 'warn',
    '@stylistic/space-before-blocks': 'warn',
    '@stylistic/space-infix-ops': 'warn',
    '@stylistic/arrow-spacing': 'warn',
    '@stylistic/space-in-parens': ['warn', 'never'],
    '@stylistic/space-before-function-paren': [
      'warn',
      { anonymous: 'always', named: 'never', asyncArrow: 'always' },
    ],
    '@stylistic/block-spacing': 'warn',
    '@stylistic/semi-spacing': 'warn',
    '@stylistic/template-curly-spacing': 'warn',
    '@stylistic/type-annotation-spacing': 'warn',
    '@stylistic/jsx-tag-spacing': ['warn', { beforeSelfClosing: 'always' }],
    '@stylistic/jsx-curly-spacing': ['warn', { when: 'never', children: true }],
    '@stylistic/jsx-equals-spacing': ['warn', 'never'],

    // ── 檔尾 ──────────────────────────────────────────────────
    '@stylistic/eol-last': ['warn', 'always'],

    // ── Tailwind class 排序（順序與 prettier-plugin-tailwindcss 相同）──
    'better-tailwindcss/enforce-consistent-class-order': ['warn', { order: 'official' }],

    // 刻意不開的規則，開了就會把換行或空白清掉：
    //   no-trailing-spaces       行尾空白
    //   no-multiple-empty-lines  連續空行
    //   padded-blocks            區塊開頭／結尾的空行
    //   max-len 與各種 *-newline  會自動併行或拆行
  },
})
