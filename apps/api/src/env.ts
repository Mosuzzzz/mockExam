import { resolve } from "node:path";
import { config } from "dotenv";

config({ path: resolve(import.meta.dir, "../../../.env") });
