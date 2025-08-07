import { Base } from './Base.js';

import { DataTypePurpose } from './simpleTypes.js';

import { UAType } from './UAType.js';
import { DataTypeDefinition } from './DataTypeDefinition.js';


export class UADataType extends UAType {
    /**
     * @param {Object} [data]
     */
    constructor(data = {}) {
        super(data);
            this.Definition = data.Definition ? new DataTypeDefinition(data.Definition) : undefined;
            this.Purpose = data.Purpose ? new DataTypePurpose(data.Purpose) : undefined;
    }

        static #__xsdMeta = {
    "Definition": {
        "xmlName": "Definition"
    },
    "Purpose": {
        "xmlName": "@_Purpose"
    }
};
        static __getXSDMeta() { return this.#__xsdMeta; }
    
}