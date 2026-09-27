import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const frontendDirectory = path.resolve(scriptDirectory, "..");
const sourceDirectory = path.join(frontendDirectory, "src");
const iconAssetsDirectory = path.join(sourceDirectory, "assets");
const outputFile = path.join(iconAssetsDirectory, "SvgIconMap.tsx");

const iconFilenamePattern = /^ic_([a-z0-9]+)_(.+)\.svg$/i;
const slugPattern = /^[a-z0-9]+(?:_[a-z0-9]+)*$/i;

function listSvgFiles(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return listSvgFiles(fullPath);
      return entry.isFile() && entry.name.toLowerCase().endsWith(".svg")
        ? [fullPath]
        : [];
    });
}

function toPascalCase(value) {
  return value
    .split(/[^a-z0-9]+/i)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");
}

function collectIcons() {
  const icons = [];

  for (const filePath of listSvgFiles(iconAssetsDirectory)) {
    const filename = path.basename(filePath);
    if (!filename.toLowerCase().startsWith("ic_")) continue;

    const match = filename.match(iconFilenamePattern);
    if (!match || !slugPattern.test(match[2])) {
      throw new Error(
        `Invalid icon filename "${filename}". Expected ic_{page}_{icon_name}.svg using letters, numbers, and underscores.`,
      );
    }

    const [, page, iconName] = match;
    const key = toPascalCase(`${page}_${iconName}`);
    const importName = `${/^[a-z_$]/i.test(key) ? "" : "Icon"}${key}Icon`;
    const relativePath = path
      .relative(path.dirname(outputFile), filePath)
      .split(path.sep)
      .join("/");

    icons.push({
      filePath,
      group: page.toLowerCase(),
      importName,
      key,
      importPath: `./${relativePath}?react`,
    });
  }

  const keys = new Set();
  const identifiers = new Set();
  for (const icon of icons) {
    if (keys.has(icon.key)) {
      throw new Error(`Duplicate icon map key "${icon.key}" (including ${icon.filePath}).`);
    }
    if (identifiers.has(icon.importName)) {
      throw new Error(`Duplicate generated import name "${icon.importName}".`);
    }
    keys.add(icon.key);
    identifiers.add(icon.importName);
  }

  return icons.sort((a, b) =>
    a.group.localeCompare(b.group) || a.key.localeCompare(b.key),
  );
}

export function isIconAsset(filePath, assetsDirectory = iconAssetsDirectory) {
  const relativePath = path.relative(assetsDirectory, filePath);
  return (
    relativePath !== "" &&
    !relativePath.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relativePath) &&
    path.basename(filePath).toLowerCase().startsWith("ic_") &&
    path.basename(filePath).toLowerCase().endsWith(".svg")
  );
}

export function generateIconMap() {
  const icons = collectIcons();
  const lines = [
    "/**",
    " * ⚠️ 此檔案由 `scripts/generate-icon-map.mjs` 自動產生，禁止手動編輯。",
    " * 手動產生：在 frontend 目錄執行 `npm run generate:icons`。",
    " * 來源：`src/assets/` 及其子目錄內，符合 `ic_{page}_{icon}.svg` 命名規則的 SVG。",
    " * 執行 dev、build、typecheck 前會自動產生；dev 時新增或刪除 SVG 也會更新。",
    " * 直接修改本檔會在下次產生時被覆蓋。",
    " */",
  ];

  if (icons.length > 0) {
    lines.push(
      ...icons.map(
        ({ importName, importPath }) =>
          `import ${importName} from ${JSON.stringify(importPath)};`,
      ),
    );
  }

  lines.push("", "export const SvgIconMap = {");

  let currentGroup;
  for (const icon of icons) {
    if (icon.group !== currentGroup) {
      if (currentGroup !== undefined) lines.push("");
      lines.push(`  // ${icon.group}`);
      currentGroup = icon.group;
    }
    const keyName = /^[a-z_$][a-z0-9_$]*$/i.test(icon.key)
      ? icon.key
      : JSON.stringify(icon.key);
    lines.push(`  ${keyName}: ${icon.importName},`);
  }

  lines.push(
    "} as const;",
    "",
    "/**",
    " * SvgIconComponent 是 SvgIconMap 內所有 SVG 元件的型別。",
    " * typeof SvgIconMap 取得 map 的型別；keyof 取得所有 key；",
    " * 再用這些 key 取出對應的元件型別。",
    " * 更新本檔：在 frontend 目錄執行 `npm run generate:icons`。",
    " */",
    "export type SvgIconComponent = (typeof SvgIconMap)[keyof typeof SvgIconMap];",
    "",
  );
  const generatedContent = `${lines.join("\n")}\n`;
  const existingContent = readFileSyncIfExists(outputFile);
  const changed = existingContent !== generatedContent;

  if (changed) writeFileSync(outputFile, generatedContent);

  return { changed, count: icons.length, outputFile };
}

function readFileSyncIfExists(filePath) {
  try {
    return readFileSync(filePath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = generateIconMap();
  const relativeOutput = path.relative(frontendDirectory, result.outputFile);
  console.log(
    result.changed
      ? `Generated ${relativeOutput} with ${result.count} icons.`
      : `${relativeOutput} is up to date (${result.count} icons).`,
  );
}
