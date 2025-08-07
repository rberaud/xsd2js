import { Base } from './Base.js';

import { UAObject } from './UAObject.js';
import { UAVariable } from './UAVariable.js';
import { UAMethod } from './UAMethod.js';
import { UAView } from './UAView.js';
import { UAObjectType } from './UAObjectType.js';
import { UAVariableType } from './UAVariableType.js';
import { UADataType } from './UADataType.js';
import { UAReferenceType } from './UAReferenceType.js';


export class NodesToAdd extends Base {
    /**
     * @param {Object} [data]
     */
    constructor(data = {}) {
        super(data);
            this.UAObject = data.UAObject ? new UAObject(data.UAObject) : undefined;
            this.UAVariable = data.UAVariable ? new UAVariable(data.UAVariable) : undefined;
            this.UAMethod = data.UAMethod ? new UAMethod(data.UAMethod) : undefined;
            this.UAView = data.UAView ? new UAView(data.UAView) : undefined;
            this.UAObjectType = data.UAObjectType ? new UAObjectType(data.UAObjectType) : undefined;
            this.UAVariableType = data.UAVariableType ? new UAVariableType(data.UAVariableType) : undefined;
            this.UADataType = data.UADataType ? new UADataType(data.UADataType) : undefined;
            this.UAReferenceType = data.UAReferenceType ? new UAReferenceType(data.UAReferenceType) : undefined;
    }

        static #__xsdMeta = {
    "UAObject": {
        "xmlName": "UAObject"
    },
    "UAVariable": {
        "xmlName": "UAVariable"
    },
    "UAMethod": {
        "xmlName": "UAMethod"
    },
    "UAView": {
        "xmlName": "UAView"
    },
    "UAObjectType": {
        "xmlName": "UAObjectType"
    },
    "UAVariableType": {
        "xmlName": "UAVariableType"
    },
    "UADataType": {
        "xmlName": "UADataType"
    },
    "UAReferenceType": {
        "xmlName": "UAReferenceType"
    }
};
        static __getXSDMeta() { return this.#__xsdMeta; }
    
}