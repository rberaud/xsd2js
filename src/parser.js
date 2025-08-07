// Copyright 2025 Remy Beraud
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {XSD_PREFIX} from "./constants.js";
import {ensureArray} from "./utils.js";

/**
 * Parses an XSD content string into structured type definitions.
 * It identifies complex types, simple types, and handles inline simple types
 * by giving them a unique name and adding them to the simple types list.
 * @param {string} xsdContent - The string content of the XSD file.
 * @returns {{complexTypes: any[], simpleTypes: any[]}}
 */
export function parseXsd(schemaObj) {
  const schema = schemaObj[`${XSD_PREFIX}schema`];
  if (!schema) {
    throw new Error("Invalid XSD schema: <xs:schema> tag not found.");
  }

  const complexTypes = ensureArray(schema[`${XSD_PREFIX}complexType`]);
  const simpleTypes = ensureArray(schema[`${XSD_PREFIX}simpleType`]);
  const inlineSimpleTypes = [];

  // Function to find and extract inline simple types
  const processNodeForInlineTypes = (node, parentTypeName) => {
    if (!node) return;
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

  return {
    complexTypes,
    simpleTypes: [...simpleTypes, ...inlineSimpleTypes],
  };
}
