import { Base } from './Base.js';

import { ModelVersion, AccessRestriction } from './simpleTypes.js';

import { ListOfRolePermissions } from './ListOfRolePermissions.js';
import { ModelTableEntry } from './ModelTableEntry.js';


export class ModelTableEntry extends Base {
    /**
     * @param {Object} [data]
     */
    constructor(data = {}) {
        super(data);
            this.RolePermissions = data.RolePermissions ? new ListOfRolePermissions(data.RolePermissions) : undefined;
            this.RequiredModel = data.RequiredModel ? [].concat(data.RequiredModel).map(item => new ModelTableEntry(item)) : [];
            this.ModelUri = data.ModelUri;
            this.XmlSchemaUri = data.XmlSchemaUri;
            this.Version = data.Version;
            this.PublicationDate = data.PublicationDate ? new dateTime(data.PublicationDate) : undefined;
            this.ModelVersion = data.ModelVersion ? new ModelVersion(data.ModelVersion) : undefined;
            this.AccessRestrictions = data.AccessRestrictions ? new AccessRestriction(data.AccessRestrictions) : undefined;
    }

        static #__xsdMeta = {
    "RolePermissions": {
        "xmlName": "RolePermissions"
    },
    "RequiredModel": {
        "xmlName": "RequiredModel"
    },
    "ModelUri": {
        "xmlName": "@_ModelUri"
    },
    "XmlSchemaUri": {
        "xmlName": "@_XmlSchemaUri"
    },
    "Version": {
        "xmlName": "@_Version"
    },
    "PublicationDate": {
        "xmlName": "@_PublicationDate"
    },
    "ModelVersion": {
        "xmlName": "@_ModelVersion"
    },
    "AccessRestrictions": {
        "xmlName": "@_AccessRestrictions"
    }
};
        static __getXSDMeta() { return this.#__xsdMeta; }
    
}