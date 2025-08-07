import { Base } from './Base.js';

import { NodeId } from './simpleTypes.js';


export class NodeIdAlias extends Base {
    /**
     * @param {Object} [data]
     */
    constructor(data = {}) {
        super(data);
            this.value = data.value ? new NodeId(data.value) : undefined;
            this.Alias = data.Alias;
    }

        static #__xsdMeta = {
    "value": {
        "xmlName": "value"
    },
    "Alias": {
        "xmlName": "@_Alias"
    }
};
        static __getXSDMeta() { return this.#__xsdMeta; }
    
}