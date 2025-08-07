import { Base } from './Base.js';

import { NodeId } from './simpleTypes.js';

import { UANode } from './UANode.js';


export class UAInstance extends UANode {
    /**
     * @param {Object} [data]
     */
    constructor(data = {}) {
        super(data);
            this.ParentNodeId = data.ParentNodeId ? new NodeId(data.ParentNodeId) : undefined;
            this.DesignToolOnly = data.DesignToolOnly;
    }

        static #__xsdMeta = {
    "ParentNodeId": {
        "xmlName": "@_ParentNodeId"
    },
    "DesignToolOnly": {
        "xmlName": "@_DesignToolOnly"
    }
};
        static __getXSDMeta() { return this.#__xsdMeta; }
    
}