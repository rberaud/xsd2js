import { Base } from './Base.js';

import { NodeToDelete } from './NodeToDelete.js';


export class NodesToDelete extends Base {
    /**
     * @param {Object} [data]
     */
    constructor(data = {}) {
        super(data);
            this.Node = data.Node ? [].concat(data.Node).map(item => new NodeToDelete(item)) : [];
    }

        static #__xsdMeta = {
    "Node": {
        "xmlName": "Node"
    }
};
        static __getXSDMeta() { return this.#__xsdMeta; }
    
}