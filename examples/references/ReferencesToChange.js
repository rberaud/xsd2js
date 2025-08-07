import { Base } from './Base.js';

import { ReferenceChange } from './ReferenceChange.js';


export class ReferencesToChange extends Base {
    /**
     * @param {Object} [data]
     */
    constructor(data = {}) {
        super(data);
            this.Reference = data.Reference ? [].concat(data.Reference).map(item => new ReferenceChange(item)) : [];
    }

        static #__xsdMeta = {
    "Reference": {
        "xmlName": "Reference"
    }
};
        static __getXSDMeta() { return this.#__xsdMeta; }
    
}