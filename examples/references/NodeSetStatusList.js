import { Base } from './Base.js';

import { NodeSetStatus } from './NodeSetStatus.js';


export class NodeSetStatusList extends Base {
    /**
     * @param {Object} [data]
     */
    constructor(data = {}) {
        super(data);
            this.Status = data.Status ? [].concat(data.Status).map(item => new NodeSetStatus(item)) : [];
    }

        static #__xsdMeta = {
    "Status": {
        "xmlName": "Status"
    }
};
        static __getXSDMeta() { return this.#__xsdMeta; }
    
}