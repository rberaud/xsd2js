# XSD2JS Architecture Overview

## Purpose

XSD2JS is a command-line tool that generates JavaScript classes from an XML Schema Definition (XSD) file. It supports customization via templates and options for code generation, enabling OPC-UA and other XML-based schema modeling in JS.

## Main Components

### 1. Entry Point (`src/main.js`)

- **Argument Parsing:** Uses `yargs` to parse CLI options (input XSD, output path, templates, etc.).
- **XSD Parsing:** Reads the XSD file and parses it into a JS object using `fast-xml-parser`.
- **Type Extraction:** Calls `parseXsd` to extract complex and simple types from the schema.
- **Code Generation:** Uses `buildClassCode` and `buildSimpleTypeCode` to generate JS code for each type.
- **Output Writing:** Delegates to `writeOutput` to write classes to files (single or multiple).

### 2. XSD Parsing (`src/parser.js`)

- **parseXsd:** Extracts complex types, simple types, and inline types from the parsed XSD object.
- **Inline Type Handling:** Detects and names inline simple types for proper code generation.

### 3. Code Generation (`src/generator.js`, `src/simpleTypeGenerator.js`)

- **buildClassCode:** Generates ES6 class code for each complex type, handling inheritance, constructor, and metadata.
- **buildSimpleTypeCode:** Generates classes for simple types (enums, aliases).
- **Property Extraction:** Uses `extractProperties` (see next section) to analyze XSD nodes and map them to JS class properties.

### 3a. Property Extraction (`src/propertyExtractor.js`)

The `propertyExtractor.js` module is responsible for translating XSD type definitions into JavaScript class property definitions. Its main export, `extractProperties`, is called during code generation for each complex type.

- **Recursive Model Processing:** Handles XSD content models (`sequence`, `choice`, `group`) recursively, flattening nested structures and resolving group references.
- **Attribute Handling:** Extracts attributes and attribute groups, supporting both direct and inherited attributes. Attributes can be exposed transparently (without `@_` prefix) based on configuration.
- **Text Content:** For types with `<xs:simpleContent>`, extracts the text value and any associated attributes, mapping them to a configurable property name (default: `value`).
- **List Detection:** Identifies properties that should be arrays (e.g., `maxOccurs="unbounded"` or unbounded choices).
- **Deduplication:** Ensures no duplicate properties are added to the class definition.
- **Configurable Output:** Honors CLI options for attribute naming, transparency, and type conversion.

This module is key to accurately mapping XSD schema structure to idiomatic JavaScript classes, supporting complex inheritance, grouping, and attribute scenarios.

### 4. Output Writer (`src/writer.js`)

- **Single File Mode:** Combines all generated classes and base class into one file.
- **Multiple Files Mode:** Writes each class to its own file, with proper import/export statements and an index file.
- **Base Class Handling:** Copies or customizes the base class as needed.

### 5. Base Class (`src/base.js`)

- **Serialization/Deserialization:** Provides `fromXML` and `toXML` for marshalling/unmarshalling between XML and JS objects.
- **Metadata:** Each generated class can expose XSD metadata for introspection.
- **Inheritance:** All generated classes extend `Base`, gaining XML handling features.

### 6. Utilities (`src/utils.js`)

- **Dependency Sorting:** Topologically sorts classes to ensure correct order for output and imports.

## Customization

- **Templates:** Users can provide custom templates for class generation, controlling constructor, metadata, and header sections.
- **Base Class:** Optionally use a custom base class for generated classes.
- **Options:** CLI flags allow control over file output, attribute handling, type tracking, and more.

## Output

- **Single File:** All classes in one JS file.
- **Multiple Files:** Each class in its own file, with an index for easy imports.
- **Base Class:** Included or referenced as needed.

## Extensibility

- Designed to be extended for new XSD features, custom templates, and integration with other XML-based standards.
