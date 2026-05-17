import { readFileSync, writeFileSync } from "fs";
import { globSync } from "glob";

const OLD_PATHS = [
  "~/components/DpContent",
  "~/components/DpInput",
  "~/components/DpTable",
  "~/components/DpConfirmDialog",
  "~/components/DpCodeInput",
];

const files = globSync("app/**/*.{ts,tsx}", { ignore: ["app/**/*.test.*", "app/**/*.spec.*"] });

for (const file of files) {
  let content = readFileSync(file, "utf-8");
  const original = content;

  // Replace all old import paths with the new barrel path
  for (const old of OLD_PATHS) {
    // Match: import { ... } from "~/components/DpXxx"
    // or: import type { ... } from "~/components/DpXxx"
    const regex = new RegExp(
      `(import\\s+(?:type\\s+)?\\{[^}]*?\\})\\s+from\\s+"${escapeRegex(old)}"`,
      "g"
    );
    content = content.replace(regex, (match, importClause) => {
      // Keep the import clause, just change the path
      return `${importClause} from "~/components/ui"`;
    });
  }

  if (content === original) continue;

  // Merge consecutive imports from the same source
  content = content.replace(
    /(import\s+(?:type\s+)?\{[^}]*?\}\s+from\s+"[^"]*")\s*\n\s*(import\s+(?:type\s+)?\{[^}]*?\}\s+from\s+"[^"]*")/g,
    (match, first, second) => {
      // Extract the source paths
      const sourceMatch1 = first.match(/from\s+"([^"]+)"/);
      const sourceMatch2 = second.match(/from\s+"([^"]+)"/);
      if (!sourceMatch1 || !sourceMatch2) return match;
      if (sourceMatch1[1] !== sourceMatch2[1]) return match;

      // Same source — merge the import clauses
      const isType1 = first.startsWith("import type");
      const isType2 = second.startsWith("import type");

      if (isType1 && isType2) {
        // Both are type imports — merge as one type import
        const merged = mergeBraces(first, second);
        return `import type { ${merged} } from "${sourceMatch1[1]}"`;
      }

      if (!isType1 && !isType2) {
        // Neither is type import — merge as one value import
        const merged = mergeBraces(first, second);
        return `import { ${merged} } from "${sourceMatch1[1]}"`;
      }

      // Mixed: one is type, one is value — use "import type { ... }" syntax inside
      const typeBraces = isType1 ? extractBraces(first) : extractBraces(second);
      const valueBraces = isType1 ? extractBraces(second) : extractBraces(first);
      return `import { ${valueBraces}, type ${typeBraces} } from "${sourceMatch1[1]}"`;
    }
  );

  // Also merge non-consecutive same-source imports (run multiple passes)
  let prevContent;
  do {
    prevContent = content;
    content = mergeSameSourceImports(content);
  } while (content !== prevContent);

  writeFileSync(file, content, "utf-8");
  console.log(`Updated: ${file}`);
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractBraces(importStr) {
  const m = importStr.match(/\{([^}]*)\}/);
  return m ? m[1].trim() : "";
}

function mergeBraces(a, b) {
  const aContent = extractBraces(a).split(",").map((s) => s.trim()).filter(Boolean);
  const bContent = extractBraces(b).split(",").map((s) => s.trim()).filter(Boolean);
  return [...new Set([...aContent, ...bContent])].join(", ");
}

function mergeSameSourceImports(content) {
  // Find all imports from ~/components/ui
  const lines = content.split("\n");
  const uiImports = [];
  const otherLines = [];

  for (const line of lines) {
    const m = line.match(/^import\s+(.+?)\s+from\s+"~\/components\/ui"$/);
    if (m) {
      uiImports.push(m[1].trim());
    } else {
      otherLines.push(line);
    }
  }

  if (uiImports.length <= 1) return content;

  // Separate type-only imports from value imports
  const typeOnly = [];
  const valueParts = [];

  for (const imp of uiImports) {
    if (imp.startsWith("type ")) {
      typeOnly.push(imp.replace(/^type\s+/, ""));
    } else {
      // Could be "type { ... }" or just "{ ... }"
      valueParts.push(imp);
    }
  }

  // Flatten the type and value parts
  const allValue = [];
  const allType = [];

  for (const v of valueParts) {
    const inner = v.replace(/^\{\s*/, "").replace(/\s*\}$/, "");
    for (const item of inner.split(",").map((s) => s.trim()).filter(Boolean)) {
      if (item.startsWith("type ")) {
        allType.push(item.replace(/^type\s+/, ""));
      } else {
        allValue.push(item);
      }
    }
  }

  for (const t of typeOnly) {
    const inner = t.replace(/^\{\s*/, "").replace(/\s*\}$/, "");
    for (const item of inner.split(",").map((s) => s.trim()).filter(Boolean)) {
      allType.push(item);
    }
  }

  const dedupedValue = [...new Set(allValue)];
  const dedupedType = [...new Set(allType)];

  const parts = [];
  if (dedupedValue.length > 0) parts.push(dedupedValue.join(", "));
  if (dedupedType.length > 0) parts.push(`type { ${dedupedType.join(", ")} }`);

  const mergedLine = `import { ${parts.join(", ")} } from "~/components/ui"`;
  return [mergedLine, ...otherLines].join("\n");
}
