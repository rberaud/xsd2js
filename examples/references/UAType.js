import { Base } from './Base.js';

import { UANode } from './UANode.js';


export class UAType extends UANode {
    /**
     * @param {Object} [data]
     */
    constructor(data = {}) {
        super(data);
            this.IsAbstract = data.IsAbstract;
    }

        static #__xsdMeta = {
    "IsAbstract": {
        "xmlName": "@_IsAbstract"
    }
};
        static __getXSDMeta() { return this.#__xsdMeta; }
    
}