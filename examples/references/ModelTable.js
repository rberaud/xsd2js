import { Base } from './Base.js';

import { ModelTableEntry } from './ModelTableEntry.js';


export class ModelTable extends Base {
    /**
     * @param {Object} [data]
     */
    constructor(data = {}) {
        super(data);
            this.Model = data.Model ? [].concat(data.Model).map(item => new ModelTableEntry(item)) : [];
    }

        static #__xsdMeta = {
    "Model": {
        "xmlName": "Model"
    }
};
        static __getXSDMeta() { return this.#__xsdMeta; }
    
}