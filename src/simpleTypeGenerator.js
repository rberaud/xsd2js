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
 * Builds the code for a single simpleType (enum, alias, list, or union).
 * @param {object} typeDef - A simpleType definition from the parsed XSD.
 * @returns {{typeName: string, code: string}|null}
 */
export function buildSimpleTypeCode(typeDef, config = {}) {
  const typeName = typeDef["@_name"];
  const restriction = typeDef[`${XSD_PREFIX}restriction`];
  // Other simple type variations like union or list can be added here.

  // Handle enums defined with <xs:restriction>
  if (restriction && restriction[`${XSD_PREFIX}enumeration`]) {
    const enums = ensureArray(restriction[`${XSD_PREFIX}enumeration`]);
    const values = enums.map((e) => `'${e["@_value"]}'`).join(", ");
    //    const baseType = restriction["@_base"]?.replace(/^.*:/, "") || "string";

    const useAccessors = !!config["generate-accessors"];
    const code = `
export class ${typeName} {
    /**
     * @param {string} value
     */
    constructor(value) {
        if (!${typeName}.values.includes(value)) {
            // Optional: throw an error for invalid enum values.
            // console.warn(\`Invalid value for ${typeName}: \${value}\`);
        }
        ${useAccessors ? "this._value = value;" : "this.value = value;"}
    }

    static get values() {
        return [${values}];
    }

        ${(() => {
          if (!useAccessors) return "";
          const notify = !!config["accessors-notification"];
          if (!notify)
            return `get value() { return this._value; }\n    set value(v) { this._value = v; }`;
          return `get value() { return this._value; }\n    set value(v) { var oldVal = this._value; this._value = v; if (this._notify) this._notify('value', oldVal, this._value); }`;
        })()}

    toString() {
        return ${useAccessors ? "this._value" : "this.value"};
    }
}
`;
    return { typeName, code };
  }

  // Handle simple type aliases (e.g., type="xs:string")
  if (restriction && restriction["@_base"]) {
    const baseType = restriction["@_base"].replace(/^.*:/, "");
    const code = `
/**
 * Represents the XSD simpleType '${typeName}' which is an alias for '${baseType}'.
 */
export class ${typeName} extends String {
    // This is essentially a type alias. Using a class wrapper allows for type checking.
    // Extending String allows it to behave like a string in most contexts.
}
`;
    return { typeName, code };
  }

  // Return null if it's an unhandled simpleType structure
  return null;
}
