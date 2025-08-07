import { Base } from './Base.js';

import { NodeIdAlias } from './NodeIdAlias.js';


export class AliasTable extends Base {
    /**
     * @param {Object} [data]
     */
    constructor(data = {}) {
        super(data);
            this.Alias = data.Alias ? [].concat(data.Alias).map(item => new NodeIdAlias(item)) : [];
    }

        static #__xsdMeta = {
    "Alias": {
        "xmlName": "Alias"
    }
};
        static __getXSDMeta() { return this.#__xsdMeta; }
    
}