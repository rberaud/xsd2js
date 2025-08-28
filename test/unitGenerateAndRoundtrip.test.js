// Unitary test: Generate classes, parse XML, and roundtrip to XML using XSD2JS modules
// This test does not spawn node.js processes; it uses direct imports and a test framework

import fs from "fs";
import path from "path";
import { parseXsd } from "../src/parser.js";
import { buildClassCode, buildSimpleTypeCode } from "../src/generator.js";
import { writeOutput } from "../src/writer.js";
import { parseStringPromise } from "xml2js";
import { vi, describe, it, beforeAll, expect } from "vitest";
import { normalizeXml2js } from "../template/base.js";

const xsdFile =
  process.env.XSD_FILE || path.resolve("examples", "UANodeSet.xsd");
const xmlFile =
  process.env.XML_FILE || path.resolve("examples", "UANodeSet.xml");
const generatedDir = path.resolve("test", "generated-unit");
const outputXml = path.resolve("test", "unit-generated-UANodeSet.xml");

let generatedClasses;
let generatedSimpleTypes;
let config;

beforeAll(async () => {
  // Prepare config for code generation
  config = {
    input: xsdFile,
    output: generatedDir,
    multipleFiles: true,
    "XSD-type": true,
    "XML-type": true,
    "transparent-attributes": true,
    "text-attribute-name": "value",
    onlyString: true,
    "generate-accessors": true,
    "accessors-notification": true,
  };
  // // Read and parse XSD
  const xsdContent = fs.readFileSync(xsdFile, "utf-8");
  const raw = await parseStringPromise(xsdContent, {
    explicitChildren: true,
    preserveChildrenOrder: true,
    explicitArray: false,
    mergeAttrs: false,
    charsAsChildren: true,
    explicitRoot: true,
  });
  const schemaObj = normalizeXml2js(raw);
  const { complexTypes, simpleTypes } = parseXsd(schemaObj);
  generatedClasses = complexTypes.map((typeDef) =>
    buildClassCode(typeDef, config, schemaObj)
  );
  generatedSimpleTypes = simpleTypes.map(buildSimpleTypeCode);
  // // Write generated classes to output folder
  writeOutput({ generatedClasses, generatedSimpleTypes, config });
});

describe("XSD2JS Unitary Roundtrip Test", () => {
  it("should parse XML and roundtrip to XML using generated classes", async () => {
    // Dynamically import the generated UANodeSet class
    const { UANodeSet } = await import(path.join(generatedDir, "UANodeSet.js"));
    // Read the XML file
    const xmlString = fs.readFileSync(xmlFile, "utf-8");
    // Parse XML to JS object
    const nodeSet = await UANodeSet.fromXML(xmlString);
    expect(nodeSet).toBeDefined();
    // Serialize back to XML
    console.log(nodeSet.toXML("UANodeSet"));
    const newXml = nodeSet.toXML("UANodeSet");
    expect(newXml).toContain("<UANodeSet");
    fs.writeFileSync(outputXml, newXml);
  });
});

// To replace the XSD or XML file, set the XSD_FILE or XML_FILE environment variable or overwrite the files in examples/
