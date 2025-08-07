import { Base } from './Base.js';

import { NodeId, QualifiedName, WriteMask, AccessRestriction, SymbolicName, ReleaseStatus } from './simpleTypes.js';

import { LocalizedText } from './LocalizedText.js';
import { ListOfReferences } from './ListOfReferences.js';
import { ListOfRolePermissions } from './ListOfRolePermissions.js';
import { ListOfExtensions } from './ListOfExtensions.js';


export class UANode extends Base {
    /**
     * @param {Object} [data]
     */
    constructor(data = {}) {
        super(data);
            this.DisplayName = data.DisplayName ? [].concat(data.DisplayName).map(item => new LocalizedText(item)) : [];
            this.Description = data.Description ? [].concat(data.Description).map(item => new LocalizedText(item)) : [];
            this.Category = data.Category;
            this.Documentation = data.Documentation;
            this.References = data.References ? new ListOfReferences(data.References) : undefined;
            this.RolePermissions = data.RolePermissions ? new ListOfRolePermissions(data.RolePermissions) : undefined;
            this.Extensions = data.Extensions ? new ListOfExtensions(data.Extensions) : undefined;
            this.NodeId = data.NodeId ? new NodeId(data.NodeId) : undefined;
            this.BrowseName = data.BrowseName ? new QualifiedName(data.BrowseName) : undefined;
            this.WriteMask = data.WriteMask ? new WriteMask(data.WriteMask) : undefined;
            this.UserWriteMask = data.UserWriteMask ? new WriteMask(data.UserWriteMask) : undefined;
            this.AccessRestrictions = data.AccessRestrictions ? new AccessRestriction(data.AccessRestrictions) : undefined;
            this.HasNoPermissions = data.HasNoPermissions;
            this.SymbolicName = data.SymbolicName ? new SymbolicName(data.SymbolicName) : undefined;
            this.ReleaseStatus = data.ReleaseStatus ? new ReleaseStatus(data.ReleaseStatus) : undefined;
    }

        static #__xsdMeta = {
    "DisplayName": {
        "xmlName": "DisplayName"
    },
    "Description": {
        "xmlName": "Description"
    },
    "Category": {
        "xmlName": "Category"
    },
    "Documentation": {
        "xmlName": "Documentation"
    },
    "References": {
        "xmlName": "References"
    },
    "RolePermissions": {
        "xmlName": "RolePermissions"
    },
    "Extensions": {
        "xmlName": "Extensions"
    },
    "NodeId": {
        "xmlName": "@_NodeId"
    },
    "BrowseName": {
        "xmlName": "@_BrowseName"
    },
    "WriteMask": {
        "xmlName": "@_WriteMask"
    },
    "UserWriteMask": {
        "xmlName": "@_UserWriteMask"
    },
    "AccessRestrictions": {
        "xmlName": "@_AccessRestrictions"
    },
    "HasNoPermissions": {
        "xmlName": "@_HasNoPermissions"
    },
    "SymbolicName": {
        "xmlName": "@_SymbolicName"
    },
    "ReleaseStatus": {
        "xmlName": "@_ReleaseStatus"
    }
};
        static __getXSDMeta() { return this.#__xsdMeta; }
    
}