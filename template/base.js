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

      const indent = "    ".repeat(level); // 4 spaces per indentation level
      const attributes = [];
      let textContent = "";
      const children = [];

      // Retrieve merged metadata for the class (includes superclasses)
      const meta = getMergedXSDMeta(node.constructor) || {};

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
          // Handle simple properties
          const s = stringifyValue(value);
          children.push(
            `${indent}    <${xmlName}>${escapeXML(s)}</${xmlName}>`
          );
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
  // Subscribers receive an object: { target, property, oldValue, newValue }
  subscribe(callback) {
    if (!this.__subscribers) this.__subscribers = new Map();
    const token = Symbol();
    this.__subscribers.set(token, callback);
    return token;
  }

  unsubscribe(token) {
    if (!this.__subscribers) return false;
    return this.__subscribers.delete(token);
  }

  _notify(property, oldValue, newValue) {
    if (!this.__subscribers) return;
    for (const cb of this.__subscribers.values()) {
      try {
        cb({ target: this, property, oldValue, newValue });
      } catch (e) {
        // swallow subscriber errors to avoid breaking host code
      }
    }
  }
}
