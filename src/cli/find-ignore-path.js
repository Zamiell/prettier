import path from "node:path";
import { resolveConfigFile } from "../index.js";
import { normalizeToPosix, printToScreen } from "./utils.js";

async function logResolvedIgnorePathOrDie(context) {
  const file = context.argv.findIgnorePath;
  const ignoreFile = await resolveConfigFile(file); // TODO
  if (ignoreFile) {
    printToScreen(normalizeToPosix(path.relative(process.cwd(), ignoreFile)));
  } else {
    throw new Error(`Can not find ignore file for "${file}".`);
  }
}

export default logResolvedIgnorePathOrDie;
