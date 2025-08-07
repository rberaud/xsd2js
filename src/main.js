#!/usr/bin/env node
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

import fs from "fs";
import path from "path";
import yargs from "yargs";
import {hideBin} from "yargs/helpers";
import {XMLParser} from "fast-xml-parser";
import {parseXsd} from "./parser.js";
import {buildClassCode, buildSimpleTypeCode} from "./generator.js";
import {writeOutput} from "./writer.js";

/**
 * Configures and parses command-line arguments using yargs.
 * @returns {object} The parsed arguments as a configuration object.
 */
function parseArguments() {
  return yargs(hideBin(process.argv))
    .usage("Usage: xsd2js -i <input.xsd> -o <output_path> [-m]")
    .option("input", {
      alias: "i",
      describe: "Path to the input XSD file",
      type: "string",
      demandOption: true,
    })
    .option("output", {
      alias: "o",
      describe: "Path for the output file or directory",
      type: "string",
      demandOption: true,
    })
    .option("m", {
      alias: "multiple-files",
      describe: "Generate a separate file for each class",
      type: "boolean",
      default: false,
    })
    .option("base", {
      alias: "b",
      describe:
        "Path to a custom Base.js file to import in the generated classes (this file will contain the base class)",
      type: "string",
    })
    .option("XSD-type", {
      describe:
        "Keep a record, in an hidden function/attribute of the class,  the original XSD type for each field that is generated (useful for serialization)",
      type: "boolean",
      default: false,
    })
    .option("XML-type", {
      describe: "Track if a field is an XML attribute",
      type: "boolean",
      default: false,
    })
    .option("transparent-attributes", {
      describe:
        "Expose XML attributes as normal properties (otherwise, attributes are prefixed with @_ in generated classes)",
      type: "boolean",
      default: false,
    })
    .option("template-file", {
      describe:
        "Path to a custom template file for class generation, instead of the default hardcoded template. Please note that the template must contain specific tags for the class name, constructor body, meta method, and header (see template-tag-* options)",
      type: "string",
    })
    .option("template-tag-body", {
      describe:
        'Tag in template for constructor body (e.g., "tag-body"). Everything will be replaced with the constructor body code, between the <tag-body> and </tag-body> tags.',
      type: "string",
    })
    .option("template-tag-meta", {
      describe:
        'Tag in template for the meta method (e.g., "tag-meta"). Everything will be replaced with the meta properties code, between the <tag-meta> and </tag-meta> tags.',
      type: "string",
    })
    .option("template-tag-header", {
      describe:
        'Tag in template for the header (e.g., "tag-header"). Everything will be replaced with the import code, between the <tag-header> and </tag-header> tags.',
      type: "string",
    })
    .check((argv) => {
      if (!fs.existsSync(argv.input)) {
        throw new Error(`Input file not found: ${argv.input}`);
      }
      return true;
    })
    .help()
    .alias("help", "h").argv;
}

/**
 * Main execution function.
 */
function main() {
  try {
    // 1. Get configuration from command line
    const config = parseArguments();

    // 2. Read and parse the XSD schema
    const xsdContent = fs.readFileSync(config.input, "utf-8");
    const schemaObj = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
    }).parse(xsdContent);

    const {complexTypes, simpleTypes} = parseXsd(schemaObj);

    // 3. Generate code from the parsed schema
    const generatedClasses = complexTypes.map((typeDef) =>
      buildClassCode(typeDef, config, schemaObj)
    );
    const generatedSimpleTypes = simpleTypes.map(buildSimpleTypeCode);

    // 4. Write the generated code to files
    writeOutput({generatedClasses, generatedSimpleTypes, config});

    console.log(
      `✅ Success! Output generated at: ${path.resolve(config.output)}`
    );
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// --- Let's Go! ---
main();
