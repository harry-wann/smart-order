# Smart Order — Frontend (React + Vite)

## 環境建置

環境安裝（Node 版本、mise / nvm、macOS 與 Windows 做法、團隊規則）統一寫在
**[專案根目錄 README](../README.md#環境建置)**，請以那份為準，避免兩份文件漂移。

快速版（已裝好 Node 24.x 的話）：

```bash
npm ci        # 不要用 npm install
npm run dev
```

| 指令 | 說明 |
| --- | --- |
| `npm run dev` | 啟動開發伺服器（HMR） |
| `npm run build` | 產生 production build |
| `npm run preview` | 本機預覽 production build |
| `npm run lint` | 執行 Oxlint |

---

## 樣板說明（React + Vite）

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
