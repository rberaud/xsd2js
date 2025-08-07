import { Base } from './Base.js';


export class NodeSetStatus extends Base {
    /**
     * @param {Object} [data]
     */
    constructor(data = {}) {
        super(data);
            this.value = data.value ? new string(data.value) : undefined;
            this.Code = data.Code ? new unsignedInt(data.Code) : undefined;
    }

        static #__xsdMeta = {
    "value": {
        "xmlName": "value"
    },
    "Code": {
        "xmlName": "@_Code"
    }
};
        static __getXSDMeta() { return this.#__xsdMeta; }
    
}