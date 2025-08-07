import { Base } from './Base.js';

import { RolePermission } from './RolePermission.js';


export class ListOfRolePermissions extends Base {
    /**
     * @param {Object} [data]
     */
    constructor(data = {}) {
        super(data);
            this.RolePermission = data.RolePermission ? [].concat(data.RolePermission).map(item => new RolePermission(item)) : [];
    }

        static #__xsdMeta = {
    "RolePermission": {
        "xmlName": "RolePermission"
    }
};
        static __getXSDMeta() { return this.#__xsdMeta; }
    
}