import { Base } from './Base.js';

import { UAType } from './UAType.js';
import { LocalizedText } from './LocalizedText.js';


export class UAReferenceType extends UAType {
    /**
     * @param {Object} [data]
     */
    constructor(data = {}) {
        super(data);
            this.InverseName = data.InverseName ? [].concat(data.InverseName).map(item => new LocalizedText(item)) : [];
            this.Symmetric = data.Symmetric;
    }

        static #__xsdMeta = {
    "InverseName": {
        "xmlName": "InverseName"
    },
    "Symmetric": {
        "xmlName": "@_Symmetric"
    }
};
        static __getXSDMeta() { return this.#__xsdMeta; }
    
}