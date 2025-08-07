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

import fs from "fs";
import {XSD_PREFIX, XSD_TYPE_TO_JS} from "./constants.js";
import {ensureArray} from "./utils.js";

/**
 * Extracts property definitions from an XSD type node (complexType, extension, etc.).
 * @param {object} typeNode - The XSD node to parse.
 * @param {object} config - The command-line configuration object.
 * @returns {Array<object>} A list of property definition objects.
 */
function extractProperties(
  typeNode,
  config,
  schema,
  groupMap = {},
  attrGroupMap = {}
) {
  const properties = [];

  // Helper to process a single element or attribute
  const processItem = (item, isAttribute = false) => {
    if (!item) return;
    // xs:any and xs:anyAttribute
    if (
      item[`${XSD_PREFIX}any`] ||
      item["@_processContents"] ||
      item["@_namespace"]
    ) {
      properties.push({
        name: isAttribute ? "anyAttribute" : "anyElement",
        xmlName: isAttribute ? "anyAttribute" : "anyElement",
        type: "any",
        isList: false,
        xsdType: "any",
        isAttribute,
        isAny: true,
      });
      return;
    }
    const originalName = isAttribute ? `@_${item["@_name"]}` : item["@_name"];
    const userFacingName =
      config["transparent-attributes"] && originalName.startsWith("@_")
        ? originalName.substring(2)
        : originalName;

    properties.push({
      name: userFacingName,
      xmlName: originalName,
      type: item["@_type"],
      isList: !isAttribute && item["@_maxOccurs"] === "unbounded",
      xsdType: item["@_type"],
      isAttribute,
      nillable: item["@_nillable"] === "true",
    });
  };

  // Helper to process a group (sequence, choice, all, group, any)
  function processGroup(group) {
    if (!group) return;
    // xs:group reference
    if (group["@_ref"]) {
      const groupName = group["@_ref"];
      const groupDef =
        groupMap[groupName] || groupMap[groupName.replace(/^.*:/, "")];
      if (groupDef && groupDef[`${XSD_PREFIX}sequence`]) {
        processGroup(groupDef[`${XSD_PREFIX}sequence`]);
      }
      if (groupDef && groupDef[`${XSD_PREFIX}choice`]) {
        processGroup(groupDef[`${XSD_PREFIX}choice`]);
      }
      if (groupDef && groupDef[`${XSD_PREFIX}all`]) {
        processGroup(groupDef[`${XSD_PREFIX}all`]);
      }
      return;
    }
    // xs:any
    if (group[`${XSD_PREFIX}any`]) {
      processItem(group[`${XSD_PREFIX}any`], false);
    }
    ensureArray(group[`${XSD_PREFIX}element`]).forEach((el) =>
      processItem(el, false)
    );
    ensureArray(group[`${XSD_PREFIX}group`]).forEach((gr) => processGroup(gr));
  }

  // Process xs:sequence, xs:choice, xs:all, xs:group
  processGroup(typeNode?.[`${XSD_PREFIX}sequence`]);
  processGroup(typeNode?.[`${XSD_PREFIX}choice`]);
  processGroup(typeNode?.[`${XSD_PREFIX}all`]);
  processGroup(typeNode?.[`${XSD_PREFIX}group`]);

  // Process attributes and attributeGroups
  ensureArray(typeNode?.[`${XSD_PREFIX}attribute`]).forEach((attr) =>
    processItem(attr, true)
  );
  ensureArray(typeNode?.[`${XSD_PREFIX}attributeGroup`]).forEach(
    (attrGroupRef) => {
      const groupName = attrGroupRef["@_ref"];
      const groupDef =
        attrGroupMap[groupName] || attrGroupMap[groupName.replace(/^.*:/, "")];
      if (groupDef) {
        ensureArray(groupDef[`${XSD_PREFIX}attribute`]).forEach((attr) =>
          processItem(attr, true)
        );
        // xs:anyAttribute in attributeGroup
        if (groupDef[`${XSD_PREFIX}anyAttribute`]) {
          processItem(groupDef[`${XSD_PREFIX}anyAttribute`], true);
        }
      }
    }
  );
  // xs:anyAttribute directly
  if (typeNode[`${XSD_PREFIX}anyAttribute`]) {
    processItem(typeNode[`${XSD_PREFIX}anyAttribute`], true);
  }

  // Handle simpleContent (value + attributes)
  const simpleContent = typeNode?.[`${XSD_PREFIX}simpleContent`];
  if (simpleContent && simpleContent[`${XSD_PREFIX}extension`]) {
    const extension = simpleContent[`${XSD_PREFIX}extension`];
    // Add the value property
    properties.push({
      name: "value",
      xmlName: "value",
      type: extension["@_base"]
        ? extension["@_base"].replace(/^.*:/, "")
        : "string",
      isList: false,
      xsdType: extension["@_base"],
      isAttribute: false,
    });
    // Add attributes
    ensureArray(extension[`${XSD_PREFIX}attribute`]).forEach((attr) =>
      processItem(attr, true)
    );
  }

  return properties;
}

/**
 * Builds the constructor body string for a class.
 * @param {Array<object>} properties - The list of properties for the class.
 * @param {Set<string>} dependencies - A Set to which dependency class names will be added.
 * @returns {string} The constructor body as a string.
 */
function buildConstructor(properties, dependencies) {
  return properties
    .map((prop) => {
      if (XSD_TYPE_TO_JS[prop.type]) {
        return `this.${prop.name} = data.${prop.name};`;
      }
      if (prop.type) {
        const dependencyName = prop.type.split(":").pop();
        dependencies.add(dependencyName);
        if (prop.isList) {
          return `this.${prop.name} = data.${prop.name} ? [].concat(data.${prop.name}).map(item => new ${dependencyName}(item)) : [];`;
        }
        return `this.${prop.name} = data.${prop.name} ? new ${dependencyName}(data.${prop.name}) : undefined;`;
      }
      return `// WARNING: Property "${prop.name}" has no type defined.\nthis.${prop.name} = data.${prop.name};`;
    })
    .map((line) => `            ${line}`)
    .join("\n");
}

/**
 * Builds the static metadata method string for a class.
 * @param {Array<object>} properties - The list of properties for the class.
 * @param {object} config - The command-line configuration object.
 * @returns {string} The metadata method as a string.
 */
function buildMetadata(properties, config) {
  if (
    !config["XSD-type"] &&
    !config["XML-type"] &&
    !config["transparent-attributes"]
  ) {
    return "";
  }

  const metaObj = {};
  properties.forEach((p) => {
    metaObj[p.name] = {
      xmlName: p.xmlName || p.name,
      ...(config["XSD-type"] && {xsdType: p.xsdType}),
      ...(config["XML-type"] && {isAttribute: p.isAttribute}),
    };
  });

  return `
        static #__xsdMeta = ${JSON.stringify(metaObj, null, 4)};
        static __getXSDMeta() { return this.#__xsdMeta; }
    `;
}

/**
 * Builds the code for a single class.
 * @param {object} typeDef - A complexType definition from the parser.
 * @param {object} config - The command-line configuration object.
 * @returns {{className: string, code: string, dependencies: Set<string>}}
 */
export function buildClassCode(typeDef, config, schemaObj) {
  const className = typeDef["@_name"];
  const dependencies = new Set();
  let parentClass = "Base";
  let properties = [];

  const complexContent = typeDef[`${XSD_PREFIX}complexContent`];
  const schema = schemaObj[`${XSD_PREFIX}schema`];
  const groupMap = buildGroupMap(schema, "group");
  const attrGroupMap = buildGroupMap(schema, "attributeGroup");

  if (complexContent && complexContent[`${XSD_PREFIX}extension`]) {
    const extension = complexContent[`${XSD_PREFIX}extension`];
    parentClass = extension["@_base"].split(":").pop();
    dependencies.add(parentClass);
    properties = extractProperties(
      extension,
      config,
      schema,
      groupMap,
      attrGroupMap
    );
  } else {
    properties = extractProperties(
      typeDef,
      config,
      schema,
      groupMap,
      attrGroupMap
    );
  }

  const constructorBody = buildConstructor(properties, dependencies);
  const metaMethod = buildMetadata(properties, config);

  // Default template
  let code = `
class ${className} extends ${parentClass} {
    /**
     * @param {Object} [data]
     */
    constructor(data = {}) {
        super(data);
${constructorBody}
    }
${metaMethod}
}`;

  // Handle custom templates if provided
  if (config["template-file"]) {
    let template = fs.readFileSync(config["template-file"], "utf-8");

    // Insert import/header section
    if (config["template-tag-header"]) {
      const tag = config["template-tag-header"];
      template = template.replace(
        new RegExp(`(<${tag}>)[\\s\\S]*?(</${tag}>)`, "m"),
        `$1\n${importSection}\n$2`
      );
    }

    // Existing body/meta logic...
    if (config["template-tag-body"]) {
      const tag = config["template-tag-body"];
      template = template.replace(
        new RegExp(`(<${tag}>)[\\s\\S]*?(</${tag}>)`, "m"),
        `$1\n${constructorBody}\n$2`
      );
    }
    if (config["template-tag-meta"]) {
      const tag = config["template-tag-meta"];
      template = template.replace(
        new RegExp(`(<${tag}>)[\\s\\S]*?(</${tag}>)`, "m"),
        `$1\n${metaMethod}\n$2`
      );
    }
    template = template.replace(/\$\{className\}/g, className);
    template = template.replace(/\$\{parentClass\}/g, parentClass);
    code = template;
  }
  return {className, code, dependencies};
}

/**
 * Builds the code for a single simpleType (enum or alias).
 * @param {object} typeDef - A simpleType definition.
 * @returns {{typeName: string, code: string}}
 */
export function buildSimpleTypeCode(typeDef) {
  const typeName = typeDef["@_name"];
  const restriction = typeDef[`${XSD_PREFIX}restriction`];
  const union = typeDef[`${XSD_PREFIX}union`];
  const list = typeDef[`${XSD_PREFIX}list`];

  if (restriction?.[`${XSD_PREFIX}enumeration`]) {
    const enums = ensureArray(restriction[`${XSD_PREFIX}enumeration`]);
    const values = enums.map((e) => `'${e["@_value"]}'`).join(", ");
    return {
      typeName,
      code: `export const ${typeName} = Object.freeze([${values}]); // enum`,
    };
  }

  if (union && union["@_memberTypes"]) {
    // Union of types
    const types = union["@_memberTypes"]
      .split(/\s+/)
      .map((t) => t.replace(/^.*:/, ""));
    return {
      typeName,
      code: `export type ${typeName} = ${types.join(" | ")}; // union`,
    };
  }

  if (list && list["@_itemType"]) {
    // List of a type
    const itemType = list["@_itemType"].replace(/^.*:/, "");
    return {
      typeName,
      code: `export type ${typeName} = ${itemType}[]; // list`,
    };
  }

  if (restriction?.["@_base"]) {
    const baseType = restriction["@_base"];
    return {
      typeName,
      code: `// Type alias for ${baseType}\nexport type ${typeName} = ${baseType};`,
    };
  }

  return {typeName, code: `// Unknown simpleType structure for: ${typeName}`};
}

/**
 * Builds a map of group definitions from the schema.
 * @param {object} schema - The XSD schema object.
 * @param {string} groupTag - The group tag to process (e.g., 'group', 'attributeGroup').
 * @returns {object} A map of group names to group definitions.
 */
function buildGroupMap(schema, groupTag) {
  const groups = {};
  const groupDefs = ensureArray(schema[`${XSD_PREFIX}${groupTag}`]);
  groupDefs.forEach((g) => {
    groups[g["@_name"]] = g;
  });
  return groups;
}
