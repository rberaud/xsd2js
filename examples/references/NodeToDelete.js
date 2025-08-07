import { Base } from './Base.js';

import { NodeId } from './simpleTypes.js';


export class NodeToDelete extends Base {
    /**
     * @param {Object} [data]
     */
    constructor(data = {}) {
        super(data);
            this.value = data.value ? new NodeId(data.value) : undefined;
            this.DeleteReverseReferences = data.DeleteReverseReferences;
    }

        static #__xsdMeta = {
    "value": {
        "xmlName": "value"
    },
    "DeleteReverseReferences": {
        "xmlName": "@_DeleteReverseReferences"
    }
};
        static __getXSDMeta() { return this.#__xsdMeta; }
    
}