import { Base } from './Base.js';

import { QualifiedName, SymbolicName } from './simpleTypes.js';

import { DataTypeField } from './DataTypeField.js';


export class DataTypeDefinition extends Base {
    /**
     * @param {Object} [data]
     */
    constructor(data = {}) {
        super(data);
            this.Field = data.Field ? [].concat(data.Field).map(item => new DataTypeField(item)) : [];
            this.Name = data.Name ? new QualifiedName(data.Name) : undefined;
            this.SymbolicName = data.SymbolicName ? new SymbolicName(data.SymbolicName) : undefined;
            this.IsUnion = data.IsUnion;
            this.IsOptionSet = data.IsOptionSet;
            this.BaseType = data.BaseType ? new QualifiedName(data.BaseType) : undefined;
    }

        static #__xsdMeta = {
    "Field": {
        "xmlName": "Field"
    },
    "Name": {
        "xmlName": "@_Name"
    },
    "SymbolicName": {
        "xmlName": "@_SymbolicName"
    },
    "IsUnion": {
        "xmlName": "@_IsUnion"
    },
    "IsOptionSet": {
        "xmlName": "@_IsOptionSet"
    },
    "BaseType": {
        "xmlName": "@_BaseType"
    }
};
        static __getXSDMeta() { return this.#__xsdMeta; }
    
}