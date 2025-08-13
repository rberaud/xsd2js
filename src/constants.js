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

// Copyright 2025 Remy Beraud
// Licensed under the Apache License, Version 2.0

export const XSD_PREFIX = "xs:";

export const XSD_TYPE_TO_JS = {
  "xs:string": "string",
  "xs:date": "Date",
  "xs:dateTime": "string",
  "xs:int": "number",
  "xs:integer": "number",
  "xs:decimal": "number",
  "xs:boolean": "boolean",
  "xs:long": "number",
  "xs:double": "number",
};
