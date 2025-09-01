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

import { ensureArray } from "./utils.js";
import { XSD_PREFIX } from "./constants.js";

/**
 * Processes a content model group (sequence, choice, etc.) recursively.
 * @param {object} node - The XSD node containing the model group.
 * @param {Array<object>} properties - The array of properties to populate.
 * @param {Function} processItem - The helper function to add a new property.
 * @param {object} groupMap - A map of named groups in the schema.
 */
function processContentModel(node, properties, processItem, groupMap) {
  if (!node) return;

  // Process <xs:sequence>
  ensureArray(node[`${XSD_PREFIX}sequence`]).forEach((sequence) => {
    processContentModel(sequence, properties, processItem, groupMap);
  });

  // Process <xs:choice>
  ensureArray(node[`${XSD_PREFIX}choice`]).forEach((choice) => {
    const isUnboundedChoice = choice["@_maxOccurs"] === "unbounded";
    ensureArray(choice[`${XSD_PREFIX}element`]).forEach((el) => {
      // Elements within a choice are flattened into the parent.
      // If the choice is unbounded, all its child elements are treated as lists.
      processItem(el, false, isUnboundedChoice);
    });
    // Recurse for nested groups within the choice
    processContentModel(choice, properties, processItem, groupMap);
  });

  // Process <xs:group> references
  ensureArray(node[`${XSD_PREFIX}group`]).forEach((groupRef) => {
    if (groupRef["@_ref"]) {
      const groupName = groupRef["@_ref"].replace(/^.*:/, "");
      const groupDef = groupMap[groupName];
      if (groupDef) {
        processContentModel(groupDef, properties, processItem, groupMap);
      }
    }
  });

  // Process direct <xs:element> children
  ensureArray(node[`${XSD_PREFIX}element`]).forEach((el) => {
    processItem(el, false);
  });
}

// Recursively search a parsed XSD node for an <xs:any> entry.
function containsXSDAny(node) {
  if (!node || typeof node !== "object") return false;
  if (node[`${XSD_PREFIX}any`]) return true;
  for (const k of Object.keys(node)) {
    const v = node[k];
    if (Array.isArray(v)) {
      for (const item of v) if (containsXSDAny(item)) return true;
    } else if (typeof v === "object") {
      if (containsXSDAny(v)) return true;
    }
  }
  return false;
}

/**
 * Extracts property definitions from an XSD type node.
 * This is the main export of this module.
 * @param {object} typeNode - The XSD node for the type (e.g., a complexType).
 * @param {object} config - The command-line configuration object.
 * @param {object} groupMap - A map of named groups in the schema.
 * @param {object} attrGroupMap - A map of named attribute groups.
 * @returns {Array<object>} A list of property definition objects.
 */
export function extractProperties(typeNode, config, groupMap, attrGroupMap) {
  const properties = [];
  const textAttrName = config["text-attribute-name"] || "value";

  /**
   * Helper to add a processed item to the properties list, avoiding duplicates.
   * @param {object} item - The XSD element or attribute node.
   * @param {boolean} isAttribute - Flag if the item is an attribute.
   * @param {boolean} forceList - Flag to force the property to be an array.
   */
  const processItem = (item, isAttribute = false, forceList = false) => {
    if (!item || !item["@_name"]) return;

    const originalName = isAttribute ? `@_${item["@_name"]}` : item["@_name"];
    const userFacingName =
      config["transparent-attributes"] && originalName.startsWith("@_")
        ? originalName.substring(2)
        : originalName;

    if (properties.some((prop) => prop.name === userFacingName)) {
      return; // Skip duplicate properties
    }

    // Detect if this element's (possibly anonymous) complexType contains an xs:any
    // and mark the property so generators/runtime can preserve raw xml fragments.
    const isAny = !!(
      containsXSDAny(item) ||
      (item[`${XSD_PREFIX}complexType`] &&
        containsXSDAny(item[`${XSD_PREFIX}complexType`]))
    );

    properties.push({
      name: userFacingName,
      xmlName: originalName,
      type: item["@_type"],
      isList:
        forceList || (!isAttribute && item["@_maxOccurs"] === "unbounded"),
      xsdType: item["@_type"],
      isAttribute,
      nillable: item["@_nillable"] === "true",
      isAny,
    });
  };

  // An XSD type has a content model. It's either simple or complex.
  const simpleContent = typeNode[`${XSD_PREFIX}simpleContent`];
  const complexContent = typeNode[`${XSD_PREFIX}complexContent`];

  if (simpleContent) {
    // Case 1: <xs:simpleContent>
    // This means the type has a text value and attributes, but no child elements.
    // This is the case for your `LocalizedText` example.
    const extension = simpleContent[`${XSD_PREFIX}extension`];
    if (extension) {
      properties.push({
        name: textAttrName,
        xmlName: "#text",
        type: extension["@_base"] || "xs:string",
        isList: false,
        xsdType: extension["@_base"],
        isAttribute: false,
      });
      ensureArray(extension[`${XSD_PREFIX}attribute`]).forEach((attr) =>
        processItem(attr, true)
      );
    }
    // This is all the properties it can have, so we return.
    return properties;
  }

  if (complexContent) {
    // Case 2: <xs:complexContent>
    // This implies inheritance. We process the content of the extension/restriction.
    const extension = complexContent[`${XSD_PREFIX}extension`];
    if (extension) {
      processContentModel(extension, properties, processItem, groupMap);
      ensureArray(extension[`${XSD_PREFIX}attribute`]).forEach((attr) =>
        processItem(attr, true)
      );
    }
    // Note: A restriction would be handled here as well if needed.
  } else {
    // Case 3: No <xs:complexContent> or <xs:simpleContent>
    // The content model (sequence, choice, etc.) is directly inside the <xs:complexType>.
    processContentModel(typeNode, properties, processItem, groupMap);
  }

  // Process attributes defined directly on the type, regardless of content model.
  ensureArray(typeNode[`${XSD_PREFIX}attribute`]).forEach((attr) =>
    processItem(attr, true)
  );
  ensureArray(typeNode[`${XSD_PREFIX}attributeGroup`]).forEach(
    (attrGroupRef) => {
      const groupName = attrGroupRef["@_ref"]?.replace(/^.*:/, "");
      const groupDef = attrGroupMap[groupName];
      if (groupDef) {
        ensureArray(groupDef[`${XSD_PREFIX}attribute`]).forEach((attr) =>
          processItem(attr, true)
        );
      }
    }
  );

  return properties;
}
