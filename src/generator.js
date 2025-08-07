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

  const textAttrName = config["text-attribute-name"] || "value";

  // Helper to process a single element or attribute
  const processItem = (item, isAttribute = false, forceList = false) => {
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
      isList:
        forceList || (!isAttribute && item["@_maxOccurs"] === "unbounded"),
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

    // xs:choice
    if (group[`${XSD_PREFIX}choice`]) {
      const choice = group[`${XSD_PREFIX}choice`];
      const choiceElements = ensureArray(choice[`${XSD_PREFIX}element`]);
      const isUnbounded =
        choice["@_maxOccurs"] === "unbounded" ||
        group["@_maxOccurs"] === "unbounded";
      // Generate a single property for the choice group
      properties.push({
        name: "choiceItems",
        xmlName: "choiceItems",
        type: choiceElements
          .map((el) => el["@_type"] || el["@_name"])
          .join(" | "),
        isList: isUnbounded,
        xsdType: choiceElements
          .map((el) => el["@_type"] || el["@_name"])
          .join(" | "),
        isAttribute: false,
        isChoice: true,
        choiceElements: choiceElements.map((el) => ({
          name: el["@_name"],
          type: el["@_type"] || el["@_name"],
        })),
      });
      // Optionally, you can also process each element in the choice individually if you want separate properties
      // choiceElements.forEach(el => processItem(el, false));
    }

    // xs:element
    ensureArray(group[`${XSD_PREFIX}element`]).forEach((el) =>
      processItem(el, false)
    );
    // Nested xs:group
    ensureArray(group[`${XSD_PREFIX}group`]).forEach((gr) => processGroup(gr));
  }

  // Recursive helper to process content models (sequence, choice, etc.)
  const processContentModel = (node) => {
    if (!node) return;

    // Process elements directly under the node
    ensureArray(node[`${XSD_PREFIX}element`]).forEach((el) => {
      processItem(el, false);
    });

    // Process choices: flatten their elements into the parent
    ensureArray(node[`${XSD_PREFIX}choice`]).forEach((choice) => {
      const isUnboundedChoice = choice["@_maxOccurs"] === "unbounded";
      // Process each element within the choice
      ensureArray(choice[`${XSD_PREFIX}element`]).forEach((el) => {
        processItem(el, false, isUnboundedChoice);
      });
      // Recurse for nested structures inside a choice (like a nested group)
      processContentModel(choice);
    });

    // Process sequences: just recurse into them
    ensureArray(node[`${XSD_PREFIX}sequence`]).forEach((sequence) => {
      processContentModel(sequence);
    });

    // Process group references
    ensureArray(node[`${XSD_PREFIX}group`]).forEach((groupRef) => {
      if (groupRef["@_ref"]) {
        const groupName = groupRef["@_ref"].replace(/^.*:/, "");
        const groupDef = groupMap[groupName];
        if (groupDef) {
          processContentModel(groupDef); // Recurse into the referenced group definition
        }
      }
    });
  };

  // Start processing from the main type definition node
  processContentModel(typeNode);

  // Also handle extensions
  const complexContent = typeNode[`${XSD_PREFIX}complexContent`];
  if (complexContent && complexContent[`${XSD_PREFIX}extension`]) {
    processContentModel(complexContent[`${XSD_PREFIX}extension`]);
  }

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
      name: textAttrName,
      xmlName: "#text",
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

  // Check for text node
  const xmlName = typeNode["@_name"];
  if (xmlName === "#text") {
    properties.push({
      name: textAttrName,
      xmlName: "#text",
      type: "any",
      isAttribute: false,
      nillable: "true",
    });
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
        if (prop.isAttribute && prop.xmlName !== prop.name) {
          // Try both transparent and original XML attribute name
          return `this.${prop.name} = data["${prop.xmlName}"];`;
        }
        return `this.${prop.name} = data.${prop.name};`;
      }
      if (prop.type) {
        const dependencyName = prop.type.split(":").pop();
        dependencies.add(dependencyName);
        if (prop.isList) {
          // Handle both single items and arrays from the parser gracefully.
          return `this.${prop.name} = data.${prop.name} ? [].concat(data.${prop.name}).map(item => new ${dependencyName}(item)) : [];`;
        }

        let output = `this.${prop.name} = data["${prop.xmlName}"] ? new ${dependencyName}(data["${prop.xmlName}"]) : undefined;`;

        if (dependencyName == "dateTime") {
          output = `this.${prop.name} = data["${prop.xmlName}"] ? data["${prop.xmlName}"] : undefined;`;
        }

        return output;
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
    if (p.xmlName === "#text") {
      metaObj[p.name] = {
        xmlName: p.xmlName,
        xsdType: p.xsdType,
        isAttribute: false,
      };
    } else {
      metaObj[p.name] = {
        xmlName: p.xmlName || p.name,
        ...(config["XSD-type"] && {xsdType: p.xsdType}),
        ...(config["XML-type"] && {isAttribute: p.isAttribute}),
      };
    }
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
 * @param {object} schemaObj - The parsed XSD schema object (with XMLParser)
 * @returns {{className: string, code: string, dependencies: Set<string>}}
 */
export function buildClassCode(typeDef, config, schemaObj) {
  const className = typeDef["@_name"];
  const dependencies = new Set();
  let parentClass = "Base";
  let properties = [];

  const complexContent = typeDef[`${XSD_PREFIX}complexContent`];
  const schema = schemaObj[`${XSD_PREFIX}schema`];

  // Existing: process named complexTypes
  const complexTypes = ensureArray(schema[`${XSD_PREFIX}complexType`]);

  // NEW: process top-level elements with inline complexType
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
export function buildSimpleTypeCode(typeDef, config) {
  const typeName = typeDef["@_name"];
  const restriction = typeDef[`${XSD_PREFIX}restriction`];
  const union = typeDef[`${XSD_PREFIX}union`];
  const list = typeDef[`${XSD_PREFIX}list`];

  // Helper to build meta info for the value property
  function buildMeta(type, isAttribute = false) {
    const metaObj = {
      value: {
        xmlName: "value",
        ...(config["XSD-type"] && {xsdType: type}),
        ...(config["XML-type"] && {isAttribute}),
      },
    };
    return `
    static #__xsdMeta = ${JSON.stringify(metaObj, null, 4)};
    static __getXSDMeta() { return this.#__xsdMeta; }
        `;
  }

  // Enum case
  if (restriction?.[`${XSD_PREFIX}enumeration`]) {
    const enums = ensureArray(restriction[`${XSD_PREFIX}enumeration`]);
    const values = enums.map((e) => `'${e["@_value"]}'`).join(", ");
    const baseType = restriction["@_base"]
      ? restriction["@_base"].replace(/^.*:/, "")
      : "string";
    return {
      typeName,
      code: `
export class ${typeName} {
    /**
     * @param {string} value
     */
    constructor(value) {
        this.value = value;
    }
    static get values() { return [${values}]; }
${buildMeta(baseType)}
}
`,
    };
  }

  // Union case
  if (union && union["@_memberTypes"]) {
    const types = union["@_memberTypes"]
      .split(/\s+/)
      .map((t) => t.replace(/^.*:/, ""));
    return {
      typeName,
      code: `
export class ${typeName} {
    /**
     * @param {any} value
     */
    constructor(value) {
        this.value = value;
    }
    // Allowed types: ${types.join(" | ")}
${buildMeta(types.join(" | "))}
}
`,
    };
  }

  // List case
  if (list && list["@_itemType"]) {
    const itemType = list["@_itemType"].replace(/^.*:/, "");
    return {
      typeName,
      code: `
export class ${typeName} {
    /**
     * @param {Array<${itemType}>} value
     */
    constructor(value) {
        this.value = Array.isArray(value) ? value : [value];
    }
${buildMeta(itemType + "[]")}
}
`,
    };
  }

  // Restriction/alias case
  if (restriction?.["@_base"]) {
    const baseType = restriction["@_base"].replace(/^.*:/, "");
    return {
      typeName,
      code: `
export class ${typeName} {
    /**
     * @param {${baseType}} value
     */
    constructor(value) {
        this.value = value;
    }
${buildMeta(baseType)}
}
`,
    };
  }

  // Fallback
  return {
    typeName,
    code: `// Unknown simpleType structure for: ${typeName}`,
  };
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
