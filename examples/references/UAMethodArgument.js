import { Base } from './Base.js';

import { LocalizedText } from './LocalizedText.js';


export class UAMethodArgument extends Base {
    /**
     * @param {Object} [data]
     */
    constructor(data = {}) {
        super(data);
            this.Name = data.Name;
            this.Description = data.Description ? [].concat(data.Description).map(item => new LocalizedText(item)) : [];
    }

        static #__xsdMeta = {
    "Name": {
        "xmlName": "Name"
    },
    "Description": {
        "xmlName": "Description"
    }
};
        static __getXSDMeta() { return this.#__xsdMeta; }
    
}