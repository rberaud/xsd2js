/**
 * parser.js
 *
 * This module is responsible for parsing an XSD schema (as a JS object) and extracting
 * structured type definitions for code generation. It identifies complex types, simple types,
 * and inline simple types, and handles top-level elements with inline complexType definitions.
 *
 * Main function:
 *   - parseXsd: Given a parsed XSD schema object, returns lists of complexTypes and simpleTypes
 *     suitable for code generation. Handles inline type extraction and mutation for correct referencing.
 *
 * Each function is documented below with parameter explanations and usage notes.
 */
// Copyright 2025 Remy Beraud
// Licensed under the Apache License, Version 2.0

import { XSD_PREFIX } from "./constants.js";
import { ensureArray } from "./utils.js";

/**
 * Parses a JS object representation of an XSD schema and extracts type definitions.
 *
 * - Identifies all <xs:complexType> and <xs:simpleType> definitions.
 * - Handles inline simple types (e.g., <xs:simpleType> nested in elements/attributes),
 *   giving them unique names and adding them to the simpleTypes list for generation.
 * - Handles top-level elements with inline <xs:complexType>, treating them as named types.
 *
 * @param {object} schemaObj - The parsed XSD schema object (from fast-xml-parser).
 * @returns {{complexTypes: any[], simpleTypes: any[]}} - Arrays of complex and simple type definitions.
 */
export function parseXsd(schemaObj) {
  const schema = schemaObj[`${XSD_PREFIX}schema`];
  if (!schema) {
    throw new Error("Invalid XSD schema: <xs:schema> tag not found.");
  }

  const complexTypes = ensureArray(schema[`${XSD_PREFIX}complexType`]);
  const simpleTypes = ensureArray(schema[`${XSD_PREFIX}simpleType`]);
  const inlineSimpleTypes = [];

  /**
   * Finds and extracts inline simple types from a node (element or attribute).
   *
   * @param {object} node - The XSD node to process (element, attribute, etc.).
   * @param {string} parentTypeName - The name of the parent type, used for generating unique type names.
   */
  const processNodeForInlineTypes = (node, parentTypeName) => {
    if (!node) return;
    /**
     * Processes an item (element or attribute), extracting inline simpleType if present.
     *
     * @param {object} item - The XSD element or attribute node.
     * @param {string} propName - The property name, used for unique type naming.
     */
    const process = (item, propName) => {
      if (item[`${XSD_PREFIX}simpleType`]) {
        const newTypeName = `${parentTypeName}_${propName}_Type`;
        // Add the inline type to our list for generation
        inlineSimpleTypes.push({
          ...item[`${XSD_PREFIX}simpleType`],
          "@_name": newTypeName,
        });
        // Mutate the original node to reference the new type name
        item["@_type"] = newTypeName;
        delete item[`${XSD_PREFIX}simpleType`];
      }
    };

    const sequence = node[`${XSD_PREFIX}sequence`];
    if (sequence) {
      ensureArray(sequence[`${XSD_PREFIX}element`]).forEach((el) =>
        process(el, el["@_name"])
      );
    }

    ensureArray(node[`${XSD_PREFIX}attribute`]).forEach((attr) =>
      process(attr, `@_${attr["@_name"]}`)
    );
  };

  // Find inline types within complex types
  complexTypes.forEach((ct) => {
    const parentName = ct["@_name"];
    processNodeForInlineTypes(ct, parentName);

    const complexContent = ct[`${XSD_PREFIX}complexContent`];
    if (complexContent && complexContent[`${XSD_PREFIX}extension`]) {
      processNodeForInlineTypes(
        complexContent[`${XSD_PREFIX}extension`],
        parentName
      );
    }
  });

  // process top-level elements with inline complexType
  const elements = ensureArray(schema[`${XSD_PREFIX}element`]);
  elements.forEach((el) => {
    if (el[`${XSD_PREFIX}complexType`]) {
      // Fake a typeDef with the element's name
      const typeDef = {
        ...el[`${XSD_PREFIX}complexType`],
        "@_name": el["@_name"],
      };
      complexTypes.push(typeDef);
    }
  });

  return {
    complexTypes,
    simpleTypes: [...simpleTypes, ...inlineSimpleTypes],
  };
}
