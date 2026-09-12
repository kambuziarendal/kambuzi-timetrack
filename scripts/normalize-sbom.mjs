import { readFileSync, writeFileSync } from "node:fs";

const path = process.argv[2];
if (!path) throw new Error("SBOM path is required.");

const document = JSON.parse(readFileSync(path, "utf8"));
delete document.serialNumber;
if (document.metadata) delete document.metadata.timestamp;
writeFileSync(path, `${JSON.stringify(document, null, 2)}\n`, { mode: 0o644 });
