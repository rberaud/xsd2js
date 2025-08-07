import { Base } from './Base.js';

import { Reference } from './Reference.js';


export class ListOfReferences extends Base {
    /**
     * @param {Object} [data]
     */
    constructor(data = {}) {
        super(data);
            this.Reference = data.Reference ? [].concat(data.Reference).map(item => new Reference(item)) : [];
    }

        static #__xsdMeta = {
    "Reference": {
        "xmlName": "Reference"
    }
};
        static __getXSDMeta() { return this.#__xsdMeta; }
    
}