import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const currentDir = dirname(fileURLToPath(import.meta.url));

config({ path: resolve(currentDir, "../../../.env") });
