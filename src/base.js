import { XMLParser } from 'fast-xml-parser';
import { Builder } from 'xml2js';

/**
 * Base class providing core XML serialization (marshalling) and deserialization (unmarshalling).
 * Generated classes will extend this.
 */
export class Base {
    /**
     * Unmarshalls an XML string into an instance of the calling class.
     * This is the entry point for deserialization.
     * @param {string} xmlString - The XML content to parse.
     * @returns {Base} An instance of the class (e.g., User) populated with data.
     */
    static fromXML(xmlString) {
        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_", // Keep consistent with our property naming for attributes
            parseAttributeValue: true,
            parseTagValue: true,
            isArray: (name, jpath, isLeafNode, isAttribute) => {
                // This is a hint to the parser to always treat certain tags as arrays,
                // which is essential for tags with maxOccurs="unbounded".
                // We'll rely on the constructor logic for now, but this is a robust alternative.
                return false; 
            }
        });

        const jsonObj = parser.parse(xmlString);
        
        // The root element is the first and only key in the parsed object
        const rootElementName = Object.keys(jsonObj)[0];
        const rootData = jsonObj[rootElementName];
        
        // 'this' refers to the static class calling the method (e.g., User).
        // The constructor of the specific class (e.g., User) is responsible for
        // recursively creating instances of its properties (e.g., Address).
        return new this(rootData);
    }

    /**
     * Marshalls the current object instance into a formatted XML string.
     * This is the entry point for serialization.
     * @param {string} rootName - The name of the root element for the XML (e.g., 'User').
     * @returns {string} The formatted XML string.
     */
    toXML(rootName) {
        const builder = new Builder({
            rootName: rootName || this.constructor.name,
            attrkey: '$', // xml2js standard for attributes, we'll transform our @_ to this
            headless: false, // We want the <?xml ...?> header
            renderOpts: { 'pretty': true, 'indent': '    ', 'newline': '\n' }
        });

        // Recursively convert the instance to a plain JS object suitable for the builder
        const dataForBuilder = this.toObject();
        
        return builder.buildObject(dataForBuilder);
    }

    /**
     * Recursively converts the class instance to a plain JavaScript object.
     * It transforms property names and nested objects into a structure
     * that the xml2js Builder can understand.
     * @returns {object}
     */
    toObject() {
        const obj = { $: {} }; // Initialize with attributes object
        
        const meta = this.constructor.__getXSDMeta ? this.constructor.__getXSDMeta() : {};
        for (const key in this) {
            if (!Object.prototype.hasOwnProperty.call(this, key) || typeof this[key] === 'function') continue;
            const value = this[key];
            if (value === undefined || value === null) continue;

            // Use metadata to determine if this is an attribute and its XML name
            const metaInfo = meta[key] || {};
            const xmlName = metaInfo.xmlName || key;
            if (metaInfo.isAttribute) {
                obj.$[xmlName.startsWith('@_') ? xmlName.substring(2) : xmlName] = value;
            } else if (value instanceof Base) {
                obj[xmlName] = value.toObject();
            } else if (Array.isArray(value)) {
                obj[xmlName] = value.map(item => (item instanceof Base ? item.toObject() : item));
            } else {
                obj[xmlName] = value;
            }
        }
        if (Object.keys(obj.$).length === 0) delete obj.$;
        return obj;
    }
}