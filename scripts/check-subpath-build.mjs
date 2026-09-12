import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

execFileSync("npm", ["run", "build", "--workspace", "frontend"], {
  env: { ...process.env, VITE_BASE_PATH: "/timetest/" },
  stdio: "inherit",
});

const html = readFileSync(
  new URL("../frontend/dist/index.html", import.meta.url),
  "utf8",
);
for (const expected of ["/timetest/assets/", "/timetest/theme-init.js"]) {
  if (!html.includes(expected)) {
    throw new Error(`Subpath build is missing ${expected}`);
  }
}

if (html.includes('src="/assets/')) {
  throw new Error("Subpath build contains a root-relative application asset.");
}

console.log("Subpath build verified for /timetest/.");
