import { Base } from './Base.js';

import { Locale } from './simpleTypes.js';


export class LocalizedText extends Base {
    /**
     * @param {Object} [data]
     */
    constructor(data = {}) {
        super(data);
            this.value = data.value ? new string(data.value) : undefined;
            this.Locale = data.Locale ? new Locale(data.Locale) : undefined;
    }

        static #__xsdMeta = {
    "value": {
        "xmlName": "value"
    },
    "Locale": {
        "xmlName": "@_Locale"
    }
};
        static __getXSDMeta() { return this.#__xsdMeta; }
    
}