import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
process.env.NODE_CONFIG_DIR = `${__dirname}/config`;
