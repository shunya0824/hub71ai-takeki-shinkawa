import { mkdir, readdir, copyFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const target = `${root}public/ocr`;
await mkdir(target, {recursive:true});
await copyFile(`${root}node_modules/tesseract.js/dist/worker.min.js`, `${target}/worker.min.js`);
await copyFile(`${root}node_modules/tesseract.js/dist/worker.min.js.LICENSE.txt`, `${target}/worker.LICENSE.txt`);
for (const file of await readdir(`${root}node_modules/tesseract.js-core`)) {
  if (file.endsWith(".wasm.js") || file.endsWith(".wasm")) await copyFile(`${root}node_modules/tesseract.js-core/${file}`, `${target}/${file}`);
}
