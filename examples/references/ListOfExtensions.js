import { Base } from './Base.js';


export class ListOfExtensions extends Base {
    /**
     * @param {Object} [data]
     */
    constructor(data = {}) {
        super(data);
            // WARNING: Property "Extension" has no type defined.
this.Extension = data.Extension;
    }

        static #__xsdMeta = {
    "Extension": {
        "xmlName": "Extension"
    }
};
        static __getXSDMeta() { return this.#__xsdMeta; }
    
}