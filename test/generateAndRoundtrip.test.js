// Test: Generate JS classes from XSD, then roundtrip back to XML
// Run this file in the debugger for step-by-step inspection

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// eslint-disable-next-line no-undef
const xsdFile = process.env.XSD_FILE || path.resolve("test", "UANodeSet.xsd");
const generatedDir = path.resolve("test", "generated");
const outputXml = path.resolve("test", "generated-UANodeSet.xsd");

// Step 1: Generate JS classes from XSD
function generateClasses() {
  if (!fs.existsSync(xsdFile)) {
    throw new Error(`XSD file not found: ${xsdFile}`);
  }
  if (!fs.existsSync(generatedDir)) {
    fs.mkdirSync(generatedDir, { recursive: true });
  }
  const cmd = `node ./src/main.js -i "${xsdFile}" -o "${generatedDir}" -m --XSD-type --XML-type --transparent-attributes`;
  console.log("Running:", cmd);
  execSync(cmd, { stdio: "inherit" });
}

// Step 2: Read generated classes and roundtrip to XML
async function roundtripToXml() {
  // Dynamically import the generated UANodeSet class
  const { UANodeSet } = await import(path.join(generatedDir, "UANodeSet.js"));
  // Read the original XSD as XML string
  const xmlString = fs.readFileSync(xsdFile, "utf-8");
  // Parse XML to JS object
  const nodeSet = UANodeSet.fromXML(xmlString);
  // Serialize back to XML
  const newXml = nodeSet.toXML("UANodeSet");
  fs.writeFileSync(outputXml, newXml);
  console.log(`Generated XML written to: ${outputXml}`);
}

// Main test runner
(async function main() {
  try {
    generateClasses();
    await roundtripToXml();
    console.log("Test completed successfully.");
  } catch (err) {
    console.error("Test failed:", err);
    // eslint-disable-next-line no-undef
    process.exit(1);
  }
})();

// To replace the XSD file, set the XSD_FILE environment variable or overwrite test/UANodeSet.xsd
