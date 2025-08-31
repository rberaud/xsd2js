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
import { enumClass, aliasClass } from "./codeTemplate.js";

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
    const values = enums.map((e) => e["@_value"]);
    const useAccessors = !!config["generate-accessors"];
    const notify = !!config["accessors-notification"];
    const code = enumClass({
      typeName,
      valuesArray: values,
      useAccessors,
      notify,
    });
    return { typeName, code };
  }

  // Handle simple type aliases (e.g., type="xs:string")
  if (restriction && restriction["@_base"]) {
    const baseType = restriction["@_base"].replace(/^.*:/, "");
    const code = aliasClass({ typeName, baseType });
    return { typeName, code };
  }

  // Return null if it's an unhandled simpleType structure
  return null;
}
