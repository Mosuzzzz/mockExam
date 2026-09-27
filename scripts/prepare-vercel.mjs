import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const source = resolve("apps/web/dist");
const output = resolve("public");

await mkdir(output, { recursive: true });
for (const entry of await readdir(output)) {
  await rm(resolve(output, entry), { recursive: true, force: true });
}
await cp(source, output, { recursive: true });
