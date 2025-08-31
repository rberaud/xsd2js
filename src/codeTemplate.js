import { XSD_TYPE_TO_JS } from "./constants.js";

/**
 * Returns the source code string for a complex class declaration.
 * Naming: templateComplexClass to avoid generic `build`/`create` prefixes used elsewhere.
 *
 * @param {{className:string,parentClass?:string,constructorBody?:string,accessorsCode?:string,metaMethod?:string}} opts
 * @returns {string} JavaScript source for the class declaration
 */
export function templateComplexClass({
  className,
  parentClass = "Base",
  constructorBody = "",
  accessorsCode = "",
  metaMethod = "",
}) {
  return `\nclass ${className} extends ${parentClass} {\n    /**\n     * @param {Object} [data]\n     */\n    constructor(data = {}) {\n        super(data);\n${constructorBody}\n    }\n\n${accessorsCode}\n\n${metaMethod}\n}`;
}

/**
 * Produce the constructor body lines for a generated class.
 * Use `templateConstructorBody` (prefix `template` to avoid `build*` collision across modules).
 *
 * Inputs:
 *  - properties: array of property descriptors (name, type, xmlName, isList, isAttribute, isAny)
 *  - dependencies: Set to collect names of other generated classes referenced in the constructor
 *  - generateAccessors: boolean, whether properties are backed by private fields
 *
 * Output: a string with indented constructor statements.
 */
export function templateConstructorBody(
  properties,
  dependencies,
  generateAccessors
) {
  return properties
    .map((prop) => {
      const isPrimitive = !!XSD_TYPE_TO_JS[prop.type];
      if (prop.xmlName === "#text") {
        if (generateAccessors) {
          return `this._${prop.name} = data["#text"] !== undefined ? data["#text"] : data.${prop.name};`;
        }
        return `this.${prop.name} = data["#text"] !== undefined ? data["#text"] : data.${prop.name};`;
      }

      if (isPrimitive) {
        if (prop.isAttribute) {
          return generateAccessors
            ? `this._${prop.name} = data["${prop.xmlName}"];`
            : `this.${prop.name} = data["${prop.xmlName}"];`;
        }
        return generateAccessors
          ? `this._${prop.name} = data.${prop.name};`
          : `this.${prop.name} = data.${prop.name};`;
      }
      if (prop.type) {
        const dependencyName = prop.type.startsWith("xs:")
          ? XSD_TYPE_TO_JS[prop.type]
          : prop.type.split(":").pop();
        if (!XSD_TYPE_TO_JS[prop.type]) {
          dependencies.add(dependencyName);
        }
        if (prop.isList) {
          if (XSD_TYPE_TO_JS[prop.type]) {
            return generateAccessors
              ? `this._${prop.name} = data.${prop.name} ? [].concat(data.${prop.name}) : [];`
              : `this.${prop.name} = data.${prop.name} ? [].concat(data.${prop.name}) : [];`;
          }
          return generateAccessors
            ? `this._${prop.name} = data.${prop.name} ? [].concat(data.${prop.name}).map(item => new ${dependencyName}(item)) : [];`
            : `this.${prop.name} = data.${prop.name} ? [].concat(data.${prop.name}).map(item => new ${dependencyName}(item)) : [];`;
        }
        const dataAccess = `data["${prop.xmlName}"] || data["${prop.name}"]`;
        if (XSD_TYPE_TO_JS[prop.type]) {
          return generateAccessors
            ? `this._${prop.name} = ${dataAccess};`
            : `this.${prop.name} = ${dataAccess};`;
        }
        return generateAccessors
          ? `this._${prop.name} = ${dataAccess} ? new ${dependencyName}(${dataAccess}) : undefined;`
          : `this.${prop.name} = ${dataAccess} ? new ${dependencyName}(${dataAccess}) : undefined;`;
      }
      return generateAccessors
        ? `this._${prop.name} = data.${prop.name};`
        : `this.${prop.name} = data.${prop.name};`;
    })
    .map((line) => `        ${line}`)
    .join("\n");
}

/**
 * Produce getter/setter source fragments for properties when accessors are requested.
 * Function name: templateAccessorsCode to keep a clear template-oriented naming (no `build*` clash).
 *
 * @param {Array<object>} properties
 * @param {object} config
 * @returns {string} combined accessors source for the class
 */
export function templateAccessorsCode(properties, config = {}) {
  if (!config["generate-accessors"]) return "";
  const notifyEnabled = !!config["accessors-notification"];
  return properties
    .map((p) => {
      const name = p.name;
      const wrapNotify = (assignExpr) =>
        notifyEnabled
          ? `var oldVal = this._${name};\n        ${assignExpr}\n        if (this._notifyPropertyChanged) this._notifyPropertyChanged("${name}", oldVal, this._${name});`
          : assignExpr;

      if (p.xmlName === "#text") {
        return `    get ${name}() { return this._${name}; }\n    set ${name}(v) { ${wrapNotify(
          `this._${name} = v;`
        )} }`;
      }
      const isPrimitive = !!XSD_TYPE_TO_JS[p.type];
      if (isPrimitive) {
        return `    get ${name}() { return this._${name}; }\n    set ${name}(v) { ${wrapNotify(
          `this._${name} = v;`
        )} }`;
      }
      if (p.type) {
        const dependencyName = p.type.startsWith("xs:")
          ? XSD_TYPE_TO_JS[p.type]
          : p.type.split(":").pop();
        if (p.isList) {
          if (XSD_TYPE_TO_JS[p.type]) {
            return `    get ${name}() { return this._${name}; }\n    set ${name}(v) { ${wrapNotify(
              `this._${name} = v ? [].concat(v) : [];`
            )} }`;
          }
          return `    get ${name}() { return this._${name}; }\n    set ${name}(v) { ${wrapNotify(
            `this._${name} = v ? [].concat(v).map(item => item instanceof ${dependencyName} ? item : new ${dependencyName}(item)) : [];`
          )} }`;
        }
        if (XSD_TYPE_TO_JS[p.type]) {
          return `    get ${name}() { return this._${name}; }\n    set ${name}(v) { ${wrapNotify(
            `this._${name} = v;`
          )} }`;
        }
        return `    get ${name}() { return this._${name}; }\n    set ${name}(v) { ${wrapNotify(
          `this._${name} = v ? (v instanceof ${dependencyName} ? v : new ${dependencyName}(v)) : undefined;`
        )} }`;
      }
      return `    get ${name}() { return this._${name}; }\n    set ${name}(v) { ${wrapNotify(
        `this._${name} = v;`
      )} }`;
    })
    .join("\n\n");
}

/**
 * Generate the static XSD metadata block for a generated class.
 * Name: templateMetadata to indicate it's a template helper producing metadata text.
 *
 * @param {Array<object>} properties
 * @returns {string} source code fragment for static metadata and accessor
 */
export function templateMetadata(properties) {
  const metaObj = {};
  properties.forEach((p) => {
    metaObj[p.name] = {
      xmlName: p.xmlName || p.name,
      xsdType: p.xsdType,
      isAttribute: p.isAttribute,
      isList: p.isList,
      isAny: !!p.isAny,
    };
  });
  return `\n    static #__xsdMeta = ${JSON.stringify(
    metaObj,
    null,
    4
  )};\n    static __getXSDMeta() { return this.#__xsdMeta; }\n`;
}

/**
 * Return the source code for a simple enum wrapper class.
 * Naming: templateEnumClass to keep a consistent prefix with other helpers.
 *
 * @param {{typeName:string,valuesArray:Array<string>,useAccessors?:boolean,notify?:boolean}} opts
 * @returns {string} source code for the enum class
 */
export function templateEnumClass({
  typeName,
  valuesArray,
  useAccessors = false,
  notify = false,
}) {
  const valuesList = valuesArray.map((v) => `'${v}'`).join(", ");
  const accessorBlock = useAccessors
    ? notify
      ? `get value() { return this._value; }\n    set value(v) { var oldVal = this._value; this._value = v; if (this._notifyPropertyChanged) this._notifyPropertyChanged('value', oldVal, this._value); }`
      : `get value() { return this._value; }\n    set value(v) { this._value = v; }`
    : "";

  return `export class ${typeName} {\n    /**\n     * @param {string} value\n     */\n    constructor(value) {\n        if (!${typeName}.values.includes(value)) {\n            // Optional: throw or warn for invalid enum values\n        }\n        ${
    useAccessors ? "this._value = value;" : "this.value = value;"
  }\n    }\n\n    static get values() { return [${valuesList}]; }\n\n    ${accessorBlock}\n\n    toString() { return ${
    useAccessors ? "this._value" : "this.value"
  }; }\n}\n`;
}

/**
 * Return the source for a simple alias class (a typed string wrapper).
 * Naming: templateAliasClass
 *
 * @param {{typeName:string,baseType:string}} opts
 * @returns {string} source code for the alias class
 */
export function templateAliasClass({ typeName, baseType }) {
  return `/**\n * Represents the XSD simpleType '${typeName}' which is an alias for '${baseType}'.\n */\nexport class ${typeName} extends String {\n    // Alias wrapper - behaves like a string\n}\n`;
}
