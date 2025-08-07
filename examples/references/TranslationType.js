import { Base } from './Base.js';

import { LocalizedText } from './LocalizedText.js';
import { StructureTranslationType } from './StructureTranslationType.js';


export class TranslationType extends Base {
    /**
     * @param {Object} [data]
     */
    constructor(data = {}) {
        super(data);
            this.Text = data.Text ? [].concat(data.Text).map(item => new LocalizedText(item)) : [];
            this.Field = data.Field ? [].concat(data.Field).map(item => new StructureTranslationType(item)) : [];
    }

        static #__xsdMeta = {
    "Text": {
        "xmlName": "Text"
    },
    "Field": {
        "xmlName": "Field"
    }
};
        static __getXSDMeta() { return this.#__xsdMeta; }
    
}