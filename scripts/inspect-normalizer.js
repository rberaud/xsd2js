import fs from "fs";
import path from "path";
import { parseStringPromise } from "xml2js";
import { normalizeXml2js } from "../src/xmlNormalizer.js";

async function run() {
  const xmlPath = path.resolve("examples", "UANodeSet.xml");
  const xml = fs.readFileSync(xmlPath, "utf8");
  const raw = await parseStringPromise(xml, {
    explicitChildren: true,
    preserveChildrenOrder: true,
    explicitArray: false,
    mergeAttrs: false,
    charsAsChildren: true,
    explicitRoot: true,
  });
  const norm = normalizeXml2js(raw);
  const root = Object.keys(norm).find(
    (k) => !k.startsWith("?") && !k.startsWith("#")
  );
  console.log("root:", root);
  const firstUA =
    norm[root] &&
    norm[root].UAObject &&
    (Array.isArray(norm[root].UAObject)
      ? norm[root].UAObject[0]
      : norm[root].UAObject);
  console.log("First UAObject keys:", Object.keys(firstUA || {}));
  console.log("\n-- NodeId normalized --");
  console.dir(firstUA && firstUA.NodeId, { depth: 4 });
  console.log("\n-- BrowseName normalized --");
  console.dir(firstUA && firstUA.BrowseName, { depth: 4 });
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
