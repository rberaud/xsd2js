import { Base } from './Base.js';

import { LocalizedText } from './LocalizedText.js';


export class StructureTranslationType extends Base {
    /**
     * @param {Object} [data]
     */
    constructor(data = {}) {
        super(data);
            this.Text = data.Text ? [].concat(data.Text).map(item => new LocalizedText(item)) : [];
            this.Name = data.Name;
    }

        static #__xsdMeta = {
    "Text": {
        "xmlName": "Text"
    },
    "Name": {
        "xmlName": "@_Name"
    }
};
        static __getXSDMeta() { return this.#__xsdMeta; }
    
}