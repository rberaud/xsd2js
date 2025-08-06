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

import fs from 'fs';
import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { XMLParser } from 'fast-xml-parser';
import { fileURLToPath } from 'url';

// --- Constants ---
const XSD_PREFIX = 'xs:';
const XSD_TYPE_TO_JS = {
    'xs:string': 'string', 'xs:date': 'Date', 'xs:int': 'number',
    'xs:integer': 'number', 'xs:decimal': 'number', 'xs:boolean': 'boolean',
    'xs:long': 'number', 'xs:double': 'number',
};

// --- Main Execution ---
function run() {
    // 1. Configure and parse command-line arguments
    const argv = yargs(hideBin(process.argv))
        .usage('Usage: node $0 -i <input.xsd> -o <output_path> [-m]')
        .option('input', {
            alias: 'i',
            describe: 'Path to the input XSD schema file',
            type: 'string',
            demandOption: true,
        })
        .option('output', {
            alias: 'o',
            describe: 'Path for the output file or directory',
            type: 'string',
            demandOption: true,
        })
        .option('multiple-files', {
            alias: 'm',
            describe: 'Generate a separate file for each class in a directory',
            type: 'boolean',
            default: false,
        })
        .option('base', {
            alias: 'b',
            describe: 'Path to the Base.js file to use',
            type: 'string',
            demandOption: false,
        })
        .check((argv) => {
            if (!fs.existsSync(argv.input)) {
                throw new Error(`Input file not found: ${argv.input}`);
            }
            return true;
        })
        .option('XSD-type', {
            describe: 'Track the original XSD type for each field',
            type: 'boolean',
            default: false,
        })
        .option('XML-type', {
            describe: 'Track if a field is an XML attribute',
            type: 'boolean',
            default: false,
        })
        .option('transparent-attributes', {
            describe: 'Expose XML attributes as normal properties (no @_/underscore prefix) to the end-user',
            type: 'boolean',
            default: false,
        })
        .help()
        .alias('help', 'h')
        .argv;
        
        
        // Determine Base.js path
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const baseJsPath = argv.base
        ? path.resolve(argv.base)
        : path.join(__dirname, 'Base.js');


    // 2. Read and parse the XSD schema
    const xsdContent = fs.readFileSync(argv.input, 'utf-8');
    const schemaObj = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' }).parse(xsdContent);
    const complexTypes = getSchemaComplexTypes(schemaObj);
    const simpleTypes = getSchemaSimpleTypes(schemaObj);

    // 3. Generate code for all classes and simpleTypes in memory
    const generatedSimpleTypes = simpleTypes.map(buildSimpleTypeCode);
    const generatedClasses = complexTypes.map(typeDef => {
        const className = typeDef['@_name']; // Do NOT remove 'Type'
        return buildClassCode(className, typeDef, argv);
    });

    // 4. Write output based on the selected mode
    if (argv.multipleFiles) {
        writeMultipleFiles(argv.output, generatedClasses, baseJsPath, generatedSimpleTypes);
    } else {
        writeSingleFile(argv.output, generatedClasses, baseJsPath, generatedSimpleTypes);
    }

    console.log(`✅ Success! Output generated at: ${path.resolve(argv.output)}`);
}

// --- Core Logic ---

/**
 * Extracts simpleType definitions from the parsed XSD object.
 */
function getSchemaSimpleTypes(schemaObj) {
    const schema = schemaObj[`${XSD_PREFIX}schema`];
    if (!schema) throw new Error('Invalid XSD schema: <xs:schema> tag not found.');

    const simpleTypes = schema[`${XSD_PREFIX}simpleType`];
    if (!simpleTypes) return [];

    return Array.isArray(simpleTypes) ? simpleTypes : [simpleTypes];
}
/**
 * Extracts complexType definitions from the parsed XSD object.
 */
function getSchemaComplexTypes(schemaObj) {
    const schema = schemaObj[`${XSD_PREFIX}schema`];
    if (!schema) throw new Error('Invalid XSD schema: <xs:schema> tag not found.');
    
    const complexTypes = schema[`${XSD_PREFIX}complexType`];
    if (!complexTypes) return [];
    
    return Array.isArray(complexTypes) ? complexTypes : [complexTypes];
}

/**
 * Builds the code for a simpleType (enum or type alias).
 * @returns {{typeName: string, code: string}}
 */
function buildSimpleTypeCode(typeDef) {
    const typeName = typeDef['@_name'];
    const restriction = typeDef[`${XSD_PREFIX}restriction`];
    if (restriction && restriction[`${XSD_PREFIX}enumeration`]) {
        // Enum case
        let enums = restriction[`${XSD_PREFIX}enumeration`];
        if (!Array.isArray(enums)) enums = [enums];
        const values = enums.map(e => `'${e['@_value']}'`).join(', ');
        return {
            typeName,
            code: `export const ${typeName} = [${values}]; // enum`
        };
    } else if (restriction && restriction['@_base']) {
        // Type alias case
        return {
            typeName,
            code: `// Alias for ${restriction['@_base']}\nexport type ${typeName} = ${restriction['@_base']};`
        };
    }
    return {
        typeName,
        code: `// Unknown simpleType: ${typeName}`
    };
}

/**
 * Builds the code for a single class and determines its dependencies.
 * @returns {{className: string, code: string, dependencies: Set<string>}}
 */
function buildClassCode(className, typeDef, argv) {
    const properties = [];
    const dependencies = new Set();
    let parentClass = 'Base'; // Default parent

    // Handle xs:complexContent/xs:extension (inheritance)
    const complexContent = typeDef[`${XSD_PREFIX}complexContent`];
    if (complexContent && complexContent[`${XSD_PREFIX}extension`]) {
        const extension = complexContent[`${XSD_PREFIX}extension`];
        if (extension['@_base']) {
            parentClass = extension['@_base'].split(':').pop();
            dependencies.add(parentClass);
        }
        // Elements/attributes are defined inside the extension
        // Handle sequence/choice inside extension
        if (extension[`${XSD_PREFIX}sequence`]) {
            let elements = extension[`${XSD_PREFIX}sequence`][`${XSD_PREFIX}element`];
            if (elements && !Array.isArray(elements)) elements = [elements];
            if (elements) {
                elements.forEach(el => {
                    let type = el['@_type'];
                    let propName = el['@_name'];
                    let isList = el['@_maxOccurs'] === 'unbounded';

                    // Handle inline simpleType
                    if (!type && el[`${XSD_PREFIX}simpleType`]) {
                        type = `${className}_${propName}_Type`;
                        if (!globalThis._inlineSimpleTypes) globalThis._inlineSimpleTypes = [];
                        globalThis._inlineSimpleTypes.push({
                            ...el[`${XSD_PREFIX}simpleType`],
                            '@_name': type
                        });
                    }

                    // For elements:
                    const userPropName = argv['transparent-attributes'] && propName.startsWith('@_')
                        ? propName.substring(2)
                        : propName;
                    properties.push({
                        name: userPropName,
                        xmlName: propName, // always keep the original XML name for metadata
                        type,
                        isList,
                        xsdType: el['@_type'] || (el[`${XSD_PREFIX}simpleType`] ? 'simpleType' : undefined),
                        isAttribute: propName.startsWith('@_')
                    });
                });
            }
        }
        // Handle attributes inside extension
        let attributes = extension[`${XSD_PREFIX}attribute`];
        if (attributes) {
            if (!Array.isArray(attributes)) attributes = [attributes];
            attributes.forEach(attr => {
                let type = attr['@_type'];
                let propName = `@_${attr['@_name']}`;
                if (!type && attr[`${XSD_PREFIX}simpleType`]) {
                    type = `${className}_${propName}_Type`;
                    if (!globalThis._inlineSimpleTypes) globalThis._inlineSimpleTypes = [];
                    globalThis._inlineSimpleTypes.push({
                        ...attr[`${XSD_PREFIX}simpleType`],
                        '@_name': type
                    });
                }
                // For attributes:
                const userAttrName = argv['transparent-attributes'] && propName.startsWith('@_')
                    ? propName.substring(2)
                    : propName;
                properties.push({
                    name: userAttrName,
                    xmlName: propName,
                    type,
                    isList: false,
                    xsdType: attr['@_type'] || (attr[`${XSD_PREFIX}simpleType`] ? 'simpleType' : undefined),
                    isAttribute: true
                });
            });
        }
    } else {
        // Standard complexType (no inheritance)
        // Process sequence elements
        const sequence = typeDef[`${XSD_PREFIX}sequence`];
        if (sequence) {
            let elements = sequence[`${XSD_PREFIX}element`];
            if (elements && !Array.isArray(elements)) elements = [elements];
            if (elements) {
                elements.forEach(el => {
                    let type = el['@_type'];
                    let propName = el['@_name'];
                    let isList = el['@_maxOccurs'] === 'unbounded';

                    if (!type && el[`${XSD_PREFIX}simpleType`]) {
                        type = `${className}_${propName}_Type`;
                        if (!globalThis._inlineSimpleTypes) globalThis._inlineSimpleTypes = [];
                        globalThis._inlineSimpleTypes.push({
                            ...el[`${XSD_PREFIX}simpleType`],
                            '@_name': type
                        });
                    }

                    // For elements:
                    const userPropName = argv['transparent-attributes'] && propName.startsWith('@_')
                        ? propName.substring(2)
                        : propName;
                    properties.push({
                        name: userPropName,
                        xmlName: propName, // always keep the original XML name for metadata
                        type,
                        isList,
                        xsdType: el['@_type'] || (el[`${XSD_PREFIX}simpleType`] ? 'simpleType' : undefined),
                        isAttribute: propName.startsWith('@_')
                    });
                });
            }
        }
        // Process attributes
        let attributes = typeDef[`${XSD_PREFIX}attribute`];
        if (attributes) {
            if (!Array.isArray(attributes)) attributes = [attributes];
            attributes.forEach(attr => {
                let type = attr['@_type'];
                let propName = `@_${attr['@_name']}`;
                if (!type && attr[`${XSD_PREFIX}simpleType`]) {
                    type = `${className}_${propName}_Type`;
                    if (!globalThis._inlineSimpleTypes) globalThis._inlineSimpleTypes = [];
                    globalThis._inlineSimpleTypes.push({
                        ...attr[`${XSD_PREFIX}simpleType`],
                        '@_name': type
                    });
                }
                // For attributes:
                const userAttrName = argv['transparent-attributes'] && propName.startsWith('@_')
                    ? propName.substring(2)
                    : propName;
                properties.push({
                    name: userAttrName,
                    xmlName: propName,
                    type,
                    isList: false,
                    xsdType: attr['@_type'] || (attr[`${XSD_PREFIX}simpleType`] ? 'simpleType' : undefined),
                    isAttribute: true
                });
            });
        }
    }

    const constructorBody = properties.map(prop => {
        if (XSD_TYPE_TO_JS[prop.type]) {
            return `        this.${prop.name} = data.${prop.name};`;
        } else if (prop.type) {
            const dependencyName = prop.type.split(':').pop();
            dependencies.add(dependencyName);
            if (prop.isList) {
                return `        this.${prop.name} = data.${prop.name} ? [].concat(data.${prop.name}).map(item => new ${dependencyName}(item)) : [];`;
            } else {
                return `        this.${prop.name} = data.${prop.name} ? new ${dependencyName}(data.${prop.name}) : undefined;`;
            }
        } else {
            return `        // WARNING: Property "${prop.name}" has no type defined.\n        this.${prop.name} = data.${prop.name};`;
        }
    }).join('\n');

    let metaMethod = '';
    if (argv['XSD-type'] || argv['XML-type'] || argv['transparent-attributes']) {
        const metaObj = {};
        properties.forEach(p => {
            metaObj[p.name] = {
                xmlName: p.xmlName || p.name
            };
            if (argv['XSD-type']) metaObj[p.name].xsdType = p.xsdType;
            if (argv['XML-type']) metaObj[p.name].isAttribute = p.isAttribute;
        });
        metaMethod = `
        static #__xsdMeta = ${JSON.stringify(metaObj, null, 4)};
        static __getXSDMeta() { return this.#__xsdMeta; }
        `;
    }
    const code = `
    class ${className} extends ${parentClass} {
        /**
         * @param {Object} [data]
         */
        constructor(data = {}) {
            super(data);
    ${constructorBody}
        }
        ${metaMethod}
    }
    `;
    return { className, code, dependencies };
}
// --- File Writing Logic ---

/**
 * Writes all generated classes and helpers to a single file.
 */
function writeSingleFile(outputFile, generatedClasses, baseJsPath) {
    // Ensure output directory exists
    const outputDir = path.dirname(outputFile);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    // Read the Base.js template
    const baseCode = fs.readFileSync(baseJsPath, 'utf-8')
        .replace(/export /g, ''); // Remove exports for single-file bundling

    // Topologically sort classes to ensure dependencies are defined before they are used
    const sortedClasses = topologicalSort(generatedClasses);
    
    const simpleTypesCode = generatedSimpleTypes.map(t => t.code).join('\n');
    const allClassCode = sortedClasses.map(c => c.code).join('\n');
    const finalCode = `// Auto-generated by XSD-to-ES6-Class generator\n\n${baseCode}\n${simpleTypesCode}\n${allClassCode}`;
    fs.writeFileSync(outputFile, finalCode);
}

/**
 * Writes each class to its own file in a specified directory.
 */
function writeMultipleFiles(outputDir, generatedClasses, baseJsPath, generatedSimpleTypes = []) {
   if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    
    // Copy Base.js to the output directory
    fs.copyFileSync(baseJsPath, path.join(outputDir, 'Base.js'));

    const classNames = [];
    generatedClasses.forEach(({ className, code, dependencies }) => {
        classNames.push(className);
        const importStatements = Array.from(dependencies)
            .map(dep => `import { ${dep} } from './${dep}.js';`)
            .join('\n');
        
        const finalCode = `import { Base } from './Base.js';\n${importStatements}\n${code.replace('class', 'export class')}`;
        fs.writeFileSync(path.join(outputDir, `${className}.js`), finalCode);
    });
    
    // Write simpleTypes to a separate file
    if (generatedSimpleTypes.length) {
        const simpleTypesCode = generatedSimpleTypes.map(t => t.code).join('\n');
        fs.writeFileSync(path.join(outputDir, 'SimpleTypes.js'), simpleTypesCode);
    }

    // Create an index.js for easy importing
    const indexContent = classNames.map(name => `export * from './${name}.js';`).join('\n');
    fs.writeFileSync(path.join(outputDir, 'index.js'), indexContent);
}

// --- Utility ---

/**
 * Sorts classes based on their dependencies.
 * @param {Array<{className: string, dependencies: Set<string>}>} classes
 * @returns {Array} Sorted classes
 */
function topologicalSort(classes) {
    const sorted = [];
    const visited = new Set();
    const classMap = new Map(classes.map(c => [c.className, c]));

    function visit(className) {
        if (visited.has(className)) return;
        
        const classNode = classMap.get(className);
        if (!classNode) return; // Dependency is likely a primitive or not in this schema

        visited.add(className);
        classNode.dependencies.forEach(dep => visit(dep));
        sorted.push(classNode);
    }

    classes.forEach(c => visit(c.className));
    return sorted;
}


// --- Let's Go! ---
run();