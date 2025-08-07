import { Base } from './Base.js';

import { NodeId } from './simpleTypes.js';


export class RolePermission extends Base {
    /**
     * @param {Object} [data]
     */
    constructor(data = {}) {
        super(data);
            this.value = data.value ? new NodeId(data.value) : undefined;
            this.Permissions = data.Permissions ? new unsignedInt(data.Permissions) : undefined;
    }

        static #__xsdMeta = {
    "value": {
        "xmlName": "value"
    },
    "Permissions": {
        "xmlName": "@_Permissions"
    }
};
        static __getXSDMeta() { return this.#__xsdMeta; }
    
}