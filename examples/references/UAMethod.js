import { Base } from './Base.js';

import { NodeId } from './simpleTypes.js';

import { UAInstance } from './UAInstance.js';
import { UAMethodArgument } from './UAMethodArgument.js';


export class UAMethod extends UAInstance {
    /**
     * @param {Object} [data]
     */
    constructor(data = {}) {
        super(data);
            this.ArgumentDescription = data.ArgumentDescription ? [].concat(data.ArgumentDescription).map(item => new UAMethodArgument(item)) : [];
            this.Executable = data.Executable;
            this.UserExecutable = data.UserExecutable;
            this.MethodDeclarationId = data.MethodDeclarationId ? new NodeId(data.MethodDeclarationId) : undefined;
    }

        static #__xsdMeta = {
    "ArgumentDescription": {
        "xmlName": "ArgumentDescription"
    },
    "Executable": {
        "xmlName": "@_Executable"
    },
    "UserExecutable": {
        "xmlName": "@_UserExecutable"
    },
    "MethodDeclarationId": {
        "xmlName": "@_MethodDeclarationId"
    }
};
        static __getXSDMeta() { return this.#__xsdMeta; }
    
}