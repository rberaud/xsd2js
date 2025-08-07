import { Base } from './Base.js';

import { UAType } from './UAType.js';


export class UAObjectType extends UAType {
    /**
     * @param {Object} [data]
     */
    constructor(data = {}) {
        super(data);

    }

        static #__xsdMeta = {};
        static __getXSDMeta() { return this.#__xsdMeta; }
    
}