import { XMLParser } from "fast-xml-parser";

/**
 * Base class providing core XML serialization (marshalling) and deserialization (unmarshalling).
 * Generated classes will extend this.
 */
export class Base {
  /**
   * Unmarshalls an XML string into an instance of the calling class.
   * This is the entry point for deserialization.
   * @param {string} xmlString - The XML content to parse.
   * @returns {Base} An instance of the class (e.g., User) populated with data.
   */
  static fromXML(xmlString) {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_", // Keep consistent with our property naming for attributes
      // eslint-disable-next-line no-undef
      parseAttributeValue: !__ONLY_STRING__, // This will be replaced by the generator
      // eslint-disable-next-line no-undef
      parseTagValue: !__ONLY_STRING__, // This will be replaced by the generator
      // eslint-disable-next-line no-unused-vars
      isArray: (name, jpath, isLeafNode, isAttribute) => {
        // This is a hint to the parser to always treat certain tags as arrays,
        // which is essential for tags with maxOccurs="unbounded".
        // We'll rely on the constructor logic for now, but this is a robust alternative.
        return false;
      },
    });

    const jsonObj = parser.parse(xmlString);

    // Filter out processing instructions (e.g., <?xml ... ?>) and comments (e.g., <!-- ... -->)
    const rootElementName = Object.keys(jsonObj).find(
      (k) => !k.startsWith("?") && !k.startsWith("#")
    );

    if (!rootElementName) {
      throw new Error("No valid root element found in the XML.");
    }

    const rootData = jsonObj[rootElementName];

    // 'this' refers to the static class calling the method (e.g., User).
    // The constructor of the specific class (e.g., User) is responsible for
    // recursively creating instances of its properties (e.g., Address).
    return new this(rootData);
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

      // Retrieve metadata for the class
      const meta = node.constructor.__getXSDMeta
        ? node.constructor.__getXSDMeta()
        : {};

      for (const key in node) {
        if (
          !Object.prototype.hasOwnProperty.call(node, key) ||
          typeof node[key] === "function"
        )
          continue;

        const value = node[key];
        if (value === undefined || value === null) continue;

        const metaInfo = meta[key] || {};
        const xmlName = metaInfo.xmlName || key;

        if (metaInfo.isAttribute) {
          // Handle attributes
          var output = `${
            xmlName.startsWith("@_") ? xmlName.substring(2) : xmlName
          }=`;

          if (value instanceof Base) {
            output = output + `"${value.value}"`;
          } else {
            output = output + `"${value}"`;
          }
          attributes.push(output);
        } else if (xmlName === "#text") {
          // Handle text content
          if (typeof value === "object" && value !== null && "value" in value) {
            textContent = value.value;
          } else {
            if (value instanceof Base) {
              children.push(generateXML(value, xmlName, level + 1));
            } else {
              textContent = value;
            }
          }
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
          children.push(
            `${indent}    <${xmlName}>${escapeXML(value)}</${xmlName}>`
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

    for (const key in this) {
      if (
        !Object.prototype.hasOwnProperty.call(this, key) ||
        typeof this[key] === "function"
      )
        continue;

      const value = this[key];
      if (value === undefined || value === null) continue; // Skip undefined or null values

      // Use metadata to determine if this is an attribute, content, or element
      const metaInfo = meta[key] || {};
      const xmlName = metaInfo.xmlName || key;

      if (metaInfo.isAttribute) {
        // Handle attributes (stored in `$`)
        attributes[xmlName.startsWith("@_") ? xmlName.substring(2) : xmlName] =
          value;
      } else if (xmlName === "#text") {
        // Handle text content (stored in `#`)
        obj["#"] = value;
      } else if (value instanceof Base) {
        // Handle nested objects (recursively call `toObject`)
        obj[xmlName] = value.toObject();
      } else if (Array.isArray(value)) {
        // Handle arrays (map each item to its object representation)
        obj[xmlName] = value.map((item) =>
          item instanceof Base ? item.toObject() : item
        );
      } else {
        // Handle simple properties
        obj[xmlName] = value;
      }
    }

    // Add attributes to the object if any exist
    if (Object.keys(attributes).length > 0) {
      obj["$"] = attributes;
    }

    return obj;
  }
}
