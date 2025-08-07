import { Base } from './Base.js';

import { NodeId } from './simpleTypes.js';


export class ReferenceChange extends Base {
    /**
     * @param {Object} [data]
     */
    constructor(data = {}) {
        super(data);
            this.value = data.value ? new NodeId(data.value) : undefined;
            this.Source = data.Source ? new NodeId(data.Source) : undefined;
            this.ReferenceType = data.ReferenceType ? new NodeId(data.ReferenceType) : undefined;
            this.IsForward = data.IsForward;
    }

        static #__xsdMeta = {
    "value": {
        "xmlName": "value"
    },
    "Source": {
        "xmlName": "@_Source"
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