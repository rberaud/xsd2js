/**
 * generator.js
 *
 * This module is responsible for generating JavaScript class code from XSD type definitions.
 * It provides functions to build ES6 class code for complex types, generate constructor logic,
 * and produce metadata for introspection. It also manages dependencies between generated classes
 * and supports integration with custom templates and configuration options.
 *
 * Main functions:
 *   - buildClassCode: Generates code for a single complexType, handling inheritance, properties, and metadata.
 *   - buildConstructor: Produces the constructor body for a class, initializing properties from input data.
 *   - buildMetadata: Generates a static method for XSD metadata, useful for introspection and validation.
 *   - buildGroupMap: Extracts named groups and attributeGroups from the schema for property resolution.
 *
 * Each function is documented below with parameter explanations and usage notes.
 */
// Copyright 2025 Remy Beraud
// Licensed under the Apache License, Version 2.0

import { XSD_PREFIX, XSD_TYPE_TO_JS } from "./constants.js";
import { ensureArray } from "./utils.js";
import { extractProperties } from "./propertyExtractor.js";
// The simple type generator is now in its own file.
// import { buildSimpleTypeCode } from "./simpleTypeGenerator.js";

// buildSimpleTypeCode can be moved to its own file as suggested above.
// For this example, I'll keep its definition here to match the user's file structure.
// But the recommendation is to split it out.
export { buildSimpleTypeCode } from "./simpleTypeGenerator.js";

/**
 * Builds the constructor body string for a generated class.
 *
 * @param {Array<object>} properties - List of property descriptors for the class, as extracted from XSD.
 * @param {Set<string>} dependencies - Set to collect names of other classes this class depends on (for imports).
 * @returns {string} The constructor body code as a string, initializing all properties.
 */
function buildConstructor(properties, dependencies, generateAccessors) {
  return properties
    .map((prop) => {
      const isPrimitive = !!XSD_TYPE_TO_JS[prop.type];
      // Handle text content nodes like <xs:simpleContent base="xs:string"> mapped to xmlName '#text'
      if (prop.xmlName === "#text") {
        // prefer normalized '#text' key, fall back to property name for compatibility
        if (generateAccessors) {
          return `this._${prop.name} = data["#text"] !== undefined ? data["#text"] : data.${prop.name};`;
        }
        return `this.${prop.name} = data["#text"] !== undefined ? data["#text"] : data.${prop.name};`;
      }

      if (isPrimitive) {
        if (prop.isAttribute) {
          return generateAccessors
            ? `this._${prop.name} = data["${prop.xmlName}"];`
            : `this.${prop.name} = data["${prop.xmlName}"];`;
        }
        return generateAccessors
          ? `this._${prop.name} = data.${prop.name};`
          : `this.${prop.name} = data.${prop.name};`;
      }
      if (prop.type) {
        const dependencyName = prop.type.startsWith("xs:")
          ? XSD_TYPE_TO_JS[prop.type]
          : prop.type.split(":").pop();
        if (!XSD_TYPE_TO_JS[prop.type]) {
          dependencies.add(dependencyName);
        }
        if (prop.isList) {
          if (XSD_TYPE_TO_JS[prop.type]) {
            return generateAccessors
              ? `this._${prop.name} = data.${prop.name} ? [].concat(data.${prop.name}) : [];`
              : `this.${prop.name} = data.${prop.name} ? [].concat(data.${prop.name}) : [];`;
          }
          return generateAccessors
            ? `this._${prop.name} = data.${prop.name} ? [].concat(data.${prop.name}).map(item => new ${dependencyName}(item)) : [];`
            : `this.${prop.name} = data.${prop.name} ? [].concat(data.${prop.name}).map(item => new ${dependencyName}(item)) : [];`;
        }
        // Handle both direct data and data under the xmlName for flexibility
        const dataAccess = `data["${prop.xmlName}"] || data["${prop.name}"]`;
        if (XSD_TYPE_TO_JS[prop.type]) {
          return generateAccessors
            ? `this._${prop.name} = ${dataAccess};`
            : `this.${prop.name} = ${dataAccess};`;
        }
        return generateAccessors
          ? `this._${prop.name} = ${dataAccess} ? new ${dependencyName}(${dataAccess}) : undefined;`
          : `this.${prop.name} = ${dataAccess} ? new ${dependencyName}(${dataAccess}) : undefined;`;
      }
      // Handle properties with no type (e.g. from <xs:any>)
      return generateAccessors
        ? `this._${prop.name} = data.${prop.name};`
        : `this.${prop.name} = data.${prop.name};`;
    })
    .map((line) => `        ${line}`)
    .join("\n");
}

/**
 * Builds the static metadata method string for a generated class.
 *
 * @param {Array<object>} properties - List of property descriptors for the class.
 * @returns {string} The static metadata method code, exposing XSD property info for introspection.
 */
function buildMetadata(properties) {
  const metaObj = {};
  properties.forEach((p) => {
    metaObj[p.name] = {
      xmlName: p.xmlName || p.name,
      xsdType: p.xsdType,
      isAttribute: p.isAttribute,
      isList: p.isList,
    };
  });
  return `
    static #__xsdMeta = ${JSON.stringify(metaObj, null, 4)};
    static __getXSDMeta() { return this.#__xsdMeta; }
`;
}

/**
 * Builds a map of named groups or attributeGroups from the XSD schema.
 *
 * @param {object} schema - The parsed XSD schema object.
 * @param {string} groupTag - The tag to process ('group' or 'attributeGroup').
 * @returns {object} Map of group names to their definitions, for use in property extraction.
 */
function buildGroupMap(schema, groupTag) {
  const groups = {};
  const groupDefs = ensureArray(schema[`${XSD_PREFIX}${groupTag}`]);
  groupDefs.forEach((g) => {
    if (g["@_name"]) {
      groups[g["@_name"]] = g;
    }
  });
  return groups;
}

/**
 * Builds the code for a single complexType class.
 *
 * @param {object} typeDef - The complexType definition object from the XSD parser. Contains all info about the type.
 * @param {object} config - The command-line configuration object, controlling output, attribute handling, etc.
 * @param {object} schemaObj - The full parsed XSD schema object, used to resolve group and attributeGroup references.
 * @returns {{className: string, code: string, dependencies: Set<string>}} - The class name, generated code, and its dependencies.
 */
export function buildClassCode(typeDef, config, schemaObj) {
  const className = typeDef["@_name"];
  const dependencies = new Set();
  let parentClass = "Base";

  const schema = schemaObj[`${XSD_PREFIX}schema`];
  const groupMap = buildGroupMap(schema, "group");
  const attrGroupMap = buildGroupMap(schema, "attributeGroup");

  // Determine parent class from <xs:extension>
  const complexContent = typeDef[`${XSD_PREFIX}complexContent`];
  if (complexContent && complexContent[`${XSD_PREFIX}extension`]) {
    const extension = complexContent[`${XSD_PREFIX}extension`];
    parentClass = extension["@_base"].split(":").pop();
    dependencies.add(parentClass);
  }

  // Use the new, clean property extractor
  const properties = extractProperties(typeDef, config, groupMap, attrGroupMap);
  const constructorBody = buildConstructor(
    properties,
    dependencies,
    !!config["generate-accessors"]
  );
  const metaMethod = buildMetadata(properties);

  // The final code assembly is now much clearer
  // If accessors requested, emit getter/setter methods for each property that delegate to hidden backing fields.
  const accessorsCode = config["generate-accessors"]
    ? properties
        .map((p) => {
          const name = p.name;
          // Build setter body mirroring constructor coercion logic when needed
          if (p.xmlName === "#text") {
            return `    get ${name}() { return this._${name}; }
    set ${name}(v) { this._${name} = v; }`;
          }
          const isPrimitive = !!XSD_TYPE_TO_JS[p.type];
          if (isPrimitive) {
            return `    get ${name}() { return this._${name}; }
    set ${name}(v) { this._${name} = v; }`;
          }
          if (p.type) {
            const dependencyName = p.type.startsWith("xs:")
              ? XSD_TYPE_TO_JS[p.type]
              : p.type.split(":").pop();
            if (p.isList) {
              if (XSD_TYPE_TO_JS[p.type]) {
                return `    get ${name}() { return this._${name}; }
    set ${name}(v) { this._${name} = v ? [].concat(v) : []; }`;
              }
              return `    get ${name}() { return this._${name}; }
    set ${name}(v) { this._${name} = v ? [].concat(v).map(item => item instanceof ${dependencyName} ? item : new ${dependencyName}(item)) : []; }`;
            }
            if (XSD_TYPE_TO_JS[p.type]) {
              return `    get ${name}() { return this._${name}; }
    set ${name}(v) { this._${name} = v; }`;
            }
            return `    get ${name}() { return this._${name}; }
    set ${name}(v) { this._${name} = v ? (v instanceof ${dependencyName} ? v : new ${dependencyName}(v)) : undefined; }`;
          }
          return `    get ${name}() { return this._${name}; }
    set ${name}(v) { this._${name} = v; }`;
        })
        .join("\n\n")
    : "";

  const code = `
class ${className} extends ${parentClass} {
    /**
     * @param {Object} [data]
     */
    constructor(data = {}) {
        super(data);
${constructorBody}
    }

${accessorsCode}

${metaMethod}
}`;

  return { className, code, dependencies };
}
