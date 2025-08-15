// Convert xml2js explicitChildren output ($ for attrs, _ for text, $$ for children)
// into the shape expected by current generator and Base: attributes prefixed with '@_' and text stored in '#text'.
export function normalizeXml2js(node) {
  if (node === null || node === undefined) return node;
  if (typeof node !== "object") return node;
  const result = {};
  if (node.$) {
    for (const [k, v] of Object.entries(node.$)) result[`@_${k}`] = v;
  }
  if (node._ !== undefined) result["#text"] = node._;
  if (Array.isArray(node.$$)) {
    for (const child of node.$$) {
      const name = child["#name"];
      const copy = Object.assign({}, child);
      delete copy["#name"];
      const n = normalizeXml2js(copy);
      if (name in result) {
        if (!Array.isArray(result[name])) result[name] = [result[name]];
        result[name].push(n);
      } else result[name] = n;
    }
  }
  const other = Object.keys(node).filter(
    (k) => k != "$" && k != "_" && k != "$$"
  );
  for (const k of other) {
    const v = node[k];
    if (Array.isArray(v)) result[k] = v.map(normalizeXml2js);
    else if (typeof v === "object") result[k] = normalizeXml2js(v);
    else result[k] = v;
  }
  return result;
}
