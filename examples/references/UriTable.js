import { Base } from './Base.js';


export class UriTable extends Base {
    /**
     * @param {Object} [data]
     */
    constructor(data = {}) {
        super(data);
            this.Uri = data.Uri;
    }

        static #__xsdMeta = {
    "Uri": {
        "xmlName": "Uri"
    }
};
        static __getXSDMeta() { return this.#__xsdMeta; }
    
}