// ═══════════════════════════════════════════════════════════
// VS Code 專用的 oxlint 設定 = lint 規則 + 格式化規則
//
// .vscode/settings.json 的 oxc.configPath 指到這裡。編輯器一次只能讀一份設定，
// 所以把兩邊合起來：
//   - .oxlintrc.json            lint 規則（npm run lint 與 CI 也是讀它）
//   - oxlint.format.config.ts   格式化規則，存檔時自動修正
// 要改規則請改上面兩份，這裡不放規則。
// ═══════════════════════════════════════════════════════════
import { defineConfig } from 'oxlint'

import lint from './.oxlintrc.json' with { type: 'json' }
import format from './oxlint.format.config.ts'

const { $schema: _schema, ...lintConfig } = lint

export default defineConfig({
  extends: [lintConfig],
  // extends 不會帶入 plugins；不重寫的話會退回 oxlint 預設的 plugin 組合，
  // 編輯器就會多出 npm run lint 沒有的警告
  plugins: lintConfig.plugins,
  jsPlugins: format.jsPlugins,
  settings: format.settings,
  rules: format.rules,
})
