import { parseStringPromise } from "xml2js";

/**
 * Base class providing core XML serialization (marshalling) and deserialization (unmarshalling).
 * Generated classes will extend this.
 */
// Local normalizer so generated Base.js is self-contained wherever copied.
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
    // Preserve the raw xml2js children array on the normalized object so generated
    // constructors can access original raw nodes when needed (non-enumerable).
    try {
      Object.defineProperty(result, "__rawChildren", {
        value: node.$$,
        enumerable: false,
        writable: false,
      });
    } catch (e) {
      // ignore if defineProperty fails in some environments
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

// Convert a value to a safe string for XML serialization.
// Preserves undefined/null as-is so callers can skip them when needed.
function stringifyValue(v) {
  if (v === undefined || v === null) return v;
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  // If it's a Base-derived instance with a `value` property prefer that.
  if (v && typeof v === "object" && "value" in v)
    return stringifyValue(v.value);
  if (v && typeof v.toString === "function") return v.toString();
  return String(v);
}

// Merge XSD metadata from the class and its superclasses so attributes
// declared on parent classes are visible for instances of subclasses.
function getMergedXSDMeta(ctor) {
  const metas = [];
  let c = ctor;
  while (c) {
    if (typeof c.__getXSDMeta === "function") metas.unshift(c.__getXSDMeta());
    c = Object.getPrototypeOf(c);
    if (!c || c === Function.prototype) break;
  }
  return Object.assign({}, ...metas);
}

export class Base {
  /**
   * Unmarshalls an XML string into an instance of the calling class.
   * This is the entry point for deserialization.
   * @param {string} xmlString - The XML content to parse.
   * @returns {Promise<Base>} An instance of the class populated with data.
   */
  static async fromXML(xmlString) {
    const raw = await parseStringPromise(xmlString, {
      explicitChildren: true,
      preserveChildrenOrder: true,
      explicitArray: false,
      mergeAttrs: false,
      charsAsChildren: true,
      explicitRoot: true,
    });
    const json = normalizeXml2js(raw);
    const root = Object.keys(json).find(
      (k) => !k.startsWith("?") && !k.startsWith("#")
    );
    if (!root) throw new Error("No valid root element found in the XML.");
    return new this(json[root]);
  }

  /**
   * Marshalls the current object instance into a formatted XML string.
   * This is the entry point for serialization.
   * @param {string} rootName - The name of the root element for the XML (e.g., 'User').
   * @param {number} indentLevel - The current indentation level (used for recursive calls).
   * @returns {string} The formatted XML string.
   */
  toXML(rootName, indentLevel = 0) {
    const generateXML = (node, nodeName, level) => {
      if (node === undefined || node === null) return "";

      if (typeof node !== "object") {
        const indent = "    ".repeat(level); // Indentation for the current level
        return `${indent}<${nodeName}>${escapeXML(node)}</${nodeName}>`;
      }

      // If this is a plain normalized xml2js node (not a Base instance),
      // serialize it directly so nested children are preserved.
      if (
        !(node instanceof Base) &&
        (node.__rawChildren ||
          Object.keys(node).some((k) => k.startsWith("@_") || k === "#text"))
      ) {
        // Use buildAttributesAndChildren to produce attributes/text and children
        const { attrs, text, childrenXml } = buildAttributesAndChildren(
          node,
          level + 1
        );
        // If raw children are available prefer serializing them to preserve namespaces and order
        if (node.__rawChildren && node.__rawChildren.length) {
          const childLines = node.__rawChildren.map((rc) =>
            rawXml2jsNodeToXML(rc, rc["#name"], level + 1)
          );
          const opening = `${"    ".repeat(level)}<${nodeName}${
            attrs ? " " + attrs : ""
          }>`;
          return childLines.length
            ? `${opening}\n${childLines.join("\n")}\n${"    ".repeat(
                level
              )}</${nodeName}>`
            : `${opening}</${nodeName}>`;
        }
        const opening = `${"    ".repeat(level)}<${nodeName}${
          attrs ? " " + attrs : ""
        }>`;
        if (childrenXml)
          return `${opening}\n${childrenXml}\n${"    ".repeat(
            level
          )}</${nodeName}>`;
        if (text !== undefined)
          return `${opening}${escapeXML(text)}</${nodeName}>`;
        return `${opening}</${nodeName}>`;
      }

      const indent = "    ".repeat(level); // 4 spaces per indentation level
      const attributes = [];
      let textContent = "";
      const children = [];

      // Helper: detect a "normalized" xml2js node (the shape produced by normalizeXml2js)
      function looksLikeNormalizedNode(v) {
        if (!v || typeof v !== "object") return false;
        // common markers: attribute keys starting with '@_' or '#text' or nested element keys
        return Object.keys(v).some(
          (k) => k.startsWith("@_") || k === "#text" || typeof v[k] === "object"
        );
      }

      // Helper: build attributes string and children inner XML from a normalized node
      function buildAttributesAndChildren(normNode, lvl) {
        const attrParts = [];
        let text = undefined;
        const childLines = [];
        for (const k of Object.keys(normNode)) {
          if (k.startsWith("@_")) {
            attrParts.push(
              `${k.substring(2)}=\"${escapeXML(String(normNode[k]))}\"`
            );
          } else if (k === "#text") {
            text = stringifyValue(normNode[k]);
          } else {
            const val = normNode[k];
            if (Array.isArray(val)) {
              val.forEach((item) => {
                if (item === undefined || item === null) return;
                if (typeof item === "object") {
                  // recursively build child
                  const child = generateXML(item, k, lvl);
                  childLines.push(child);
                } else {
                  childLines.push(
                    `${"    ".repeat(lvl)}<${k}>${escapeXML(
                      String(item)
                    )}</${k}>`
                  );
                }
              });
            } else {
              if (typeof val === "object") {
                childLines.push(generateXML(val, k, lvl));
              } else {
                childLines.push(
                  `${"    ".repeat(lvl)}<${k}>${escapeXML(String(val))}</${k}>`
                );
              }
            }
          }
        }
        return {
          attrs: attrParts.join(" "),
          text,
          childrenXml: childLines.join("\n"),
        };
      }

      // Helper: serialize a raw xml2js child node (the shape produced when explicitChildren=true)
      function rawXml2jsNodeToXML(rawNode, forcedName, lvl) {
        const nm = forcedName || rawNode["#name"];
        const ind = "    ".repeat(lvl);
        if (!nm) return "";
        const parts = [];
        // attributes
        if (rawNode.$) {
          const attrPairs = Object.entries(rawNode.$).map(
            ([k, v]) => `${k}=\"${escapeXML(String(v))}\"`
          );
          parts.push(
            `${ind}<${nm}${attrPairs.length ? " " + attrPairs.join(" ") : ""}>`
          );
        } else {
          parts.push(`${ind}<${nm}>`);
        }
        // text
        if (rawNode._ !== undefined) {
          parts.push(escapeXML(String(rawNode._)));
        }
        // children
        if (Array.isArray(rawNode.$$)) {
          for (const c of rawNode.$$) {
            parts.push(rawXml2jsNodeToXML(c, c["#name"], lvl + 1));
          }
        }
        parts.push(`${ind}</${nm}>`);
        return parts.join("\n");
      }
      // Retrieve merged metadata for the class (includes superclasses)
      const meta = getMergedXSDMeta(node.constructor) || {};

      // If this is a plain normalized xml2js node (not a Base instance),
      // serialize it directly so nested children are preserved.
      if (
        !(node instanceof Base) &&
        (node.__rawChildren ||
          Object.keys(node).some((k) => k.startsWith("@_") || k === "#text"))
      ) {
        const { attrs, text, childrenXml } = buildAttributesAndChildren(
          node,
          level + 1
        );
        if (node.__rawChildren && node.__rawChildren.length) {
          const childLines = node.__rawChildren.map((rc) =>
            rawXml2jsNodeToXML(rc, rc["#name"], level + 1)
          );
          const opening = `${"    ".repeat(level)}<${nodeName}${
            attrs ? " " + attrs : ""
          }>`;
          return childLines.length
            ? `${opening}\n${childLines.join("\n")}\n${"    ".repeat(
                level
              )}</${nodeName}>`
            : `${opening}</${nodeName}>`;
        }
        const opening = `${"    ".repeat(level)}<${nodeName}${
          attrs ? " " + attrs : ""
        }>`;
        if (childrenXml)
          return `${opening}\n${childrenXml}\n${"    ".repeat(
            level
          )}</${nodeName}>`;
        if (text !== undefined)
          return `${opening}${escapeXML(text)}</${nodeName}>`;
        return `${opening}</${nodeName}>`;
      }

      // Iterate over metadata keys, not instance fields, to support accessor-backed properties
      for (const key of Object.keys(meta)) {
        // Use accessor (getter) for value
        const value = node[key];
        if (value === undefined || value === null) continue;

        const metaInfo = meta[key] || {};
        const xmlName = metaInfo.xmlName || key;

        if (metaInfo.isAttribute) {
          // Handle attributes
          var output = `${
            xmlName.startsWith("@_") ? xmlName.substring(2) : xmlName
          }=`;

          if (value instanceof Base && value.value !== undefined) {
            output = output + `"${stringifyValue(value.value)}"`;
          } else {
            output = output + `"${stringifyValue(value)}"`;
          }
          attributes.push(output);
        } else if (xmlName === "#text") {
          // Handle text content
          textContent = stringifyValue(value);
        } else if (Array.isArray(value)) {
          // Handle arrays (recursively process each item)
          value.forEach((item) => {
            children.push(generateXML(item, xmlName, level + 1));
          });
        } else if (value instanceof Base) {
          // Handle nested objects (recursively process)
          children.push(generateXML(value, xmlName, level + 1));
        } else {
          // Handle simple properties or normalized xml fragments
          if (looksLikeNormalizedNode(value)) {
            const { attrs, text, childrenXml } = buildAttributesAndChildren(
              value,
              level + 1
            );
            const opening = `${indent}    <${xmlName}${
              attrs ? " " + attrs : ""
            }>`;
            if (childrenXml) {
              children.push(
                `${opening}\n${childrenXml}\n${indent}    </${xmlName}>`
              );
            } else if (text !== undefined) {
              children.push(`${opening}${escapeXML(text)}</${xmlName}>`);
            } else {
              children.push(`${opening}</${xmlName}>`);
            }
          } else if (value && value.__rawChildren) {
            // The property holds a normalized object that also preserved the raw xml2js children
            const childLines = [];
            value.__rawChildren.forEach((rawChild) => {
              childLines.push(
                rawXml2jsNodeToXML(rawChild, rawChild["#name"], level + 1)
              );
            });
            const opening = `${indent}    <${xmlName}>`;
            if (childLines.length) {
              children.push(
                `${opening}\n${childLines.join(
                  "\n"
                )}\n${indent}    </${xmlName}>`
              );
            } else {
              children.push(`${opening}</${xmlName}>`);
            }
          } else {
            const s = stringifyValue(value);
            children.push(
              `${indent}    <${xmlName}>${escapeXML(s)}</${xmlName}>`
            );
          }
        }
      }

      // Build the opening tag with attributes
      const openingTag = `${indent}<${nodeName}${
        attributes.length > 0 ? " " + attributes.join(" ") : ""
      }>`;

      // Build the closing tag
      const closingTag = `${indent}</${nodeName}>`;

      // Combine everything
      if (children.length > 0) {
        return `${openingTag}\n${
          textContent ? `${indent}    ${escapeXML(textContent)}\n` : ""
        }${children.join("\n")}\n${closingTag}`;
      } else if (textContent) {
        return `${openingTag}${escapeXML(textContent)}${closingTag}`;
      } else {
        return `${openingTag}${closingTag}`;
      }
    };

    // Escape special XML characters
    const escapeXML = (str) => {
      if (typeof str !== "string") return str;
      return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
    };

    // Start the XML generation with the root element
    return generateXML(this, rootName || this.constructor.name, indentLevel);
  }

  /**
   * Recursively converts the class instance to a plain JavaScript object.
   * It transforms property names and nested objects into a structure
   * that the xml2js Builder can understand.
   * @returns {object}
   */
  toObject() {
    const obj = {}; // Initialize the object for XML generation
    const attributes = {}; // Store attributes separately in `$`

    // Retrieve metadata for the class
    const meta = this.constructor.__getXSDMeta
      ? this.constructor.__getXSDMeta()
      : {};

    // Iterate over metadata keys so accessors are used when present (backing fields ignored)
    for (const key of Object.keys(meta)) {
      const value = this[key];
      if (value === undefined || value === null) continue; // Skip undefined or null values

      // Use metadata to determine if this is an attribute, content, or element
      const metaInfo = meta[key] || {};
      const xmlName = metaInfo.xmlName || key;

      if (metaInfo.isAttribute) {
        // Handle attributes (stored in `$`)
        attributes[xmlName.startsWith("@_") ? xmlName.substring(2) : xmlName] =
          stringifyValue(value);
      } else if (xmlName === "#text") {
        // Handle text content (stored in `#`)
        obj["#"] = stringifyValue(value);
      } else if (value instanceof Base) {
        // Handle nested objects (recursively call `toObject`)
        obj[xmlName] = value.toObject();
      } else if (Array.isArray(value)) {
        // Handle arrays (map each item to its object representation)
        obj[xmlName] = value.map((item) =>
          item instanceof Base ? item.toObject() : stringifyValue(item)
        );
      } else {
        // Handle simple properties
        obj[xmlName] = stringifyValue(value);
      }
    }

    // Add attributes to the object if any exist
    if (Object.keys(attributes).length > 0) {
      obj["$"] = attributes;
    }

    return obj;
  }

  // --- Notification subscription API ---
  // Subscribers can be either a function or an object with an `onPropertyChange` method.
  // For property changes we call `onPropertyChange({ target, property, oldValue, newValue })`.
  subscribe(listener) {
    if (!this.__subscribers) this.__subscribers = new Map();
    const token = Symbol();
    this.__subscribers.set(token, listener);
    return token;
  }

  unsubscribe(token) {
    if (!this.__subscribers) return false;
    return this.__subscribers.delete(token);
  }

  _notifyPropertyChanged(property, oldValue, newValue) {
    if (!this.__subscribers) return;
    for (const listener of this.__subscribers.values()) {
      try {
        if (typeof listener === "function") {
          // legacy: function(listener) receives the event object
          listener({ target: this, property, oldValue, newValue });
        } else if (
          listener &&
          typeof listener.onPropertyChange === "function"
        ) {
          listener.onPropertyChange({
            target: this,
            property,
            oldValue,
            newValue,
          });
        }
      } catch (e) {
        // swallow subscriber errors to avoid breaking host code
      }
    }
  }
}
