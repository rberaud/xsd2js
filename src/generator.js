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
import {
  templateComplexClass,
  templateConstructorBody,
  templateAccessorsCode,
  templateMetadata,
} from "./codeTemplate.js";
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
// constructor/body/accessors/metadata are delegated to template helpers

/**
 * Metadata generation delegated to template helpers (see src/codeTemplate.js).
 */

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
  const constructorBody = templateConstructorBody(
    properties,
    dependencies,
    !!config["generate-accessors"]
  );
  const accessorsCode = templateAccessorsCode(properties, config);
  const metaMethod = templateMetadata(properties);

  const code = templateComplexClass({
    className,
    parentClass,
    constructorBody,
    accessorsCode,
    metaMethod,
  });

  return { className, code, dependencies };
}
