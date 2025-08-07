import { Base } from './Base.js';

import { NodeId } from './simpleTypes.js';


export class Reference extends Base {
    /**
     * @param {Object} [data]
     */
    constructor(data = {}) {
        super(data);
            this.value = data.value ? new NodeId(data.value) : undefined;
            this.ReferenceType = data.ReferenceType ? new NodeId(data.ReferenceType) : undefined;
            this.IsForward = data.IsForward;
    }

        static #__xsdMeta = {
    "value": {
        "xmlName": "value"
    },
    "ReferenceType": {
        "xmlName": "@_ReferenceType"
    },
    "IsForward": {
        "xmlName": "@_IsForward"
    }
};
        static __getXSDMeta() { return this.#__xsdMeta; }
    
}