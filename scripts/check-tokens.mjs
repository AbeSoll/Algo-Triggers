import { readFileSync } from "node:fs";
const design = readFileSync(new URL("../DESIGN.md", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const entries = [
  ...design
    .split("typography:")[0]
    .matchAll(/^  ([\w-]+): "(#[\da-fA-F]{6})"/gm),
];
for (const [, name, value] of entries) {
  const match = css.match(new RegExp(`--${name}:\\s*(#[\\da-fA-F]{6})`));
  if (match?.[1].toLowerCase() !== value.toLowerCase())
    throw new Error(`Token drift: ${name}`);
}
console.log(`${entries.length} documented color tokens match runtime CSS.`);
