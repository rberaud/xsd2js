import { Base } from './Base.js';

import { NodeId, ValueRank, ArrayDimensions, AccessLevel, Duration } from './simpleTypes.js';

import { UAInstance } from './UAInstance.js';
import { TranslationType } from './TranslationType.js';


export class UAVariable extends UAInstance {
    /**
     * @param {Object} [data]
     */
    constructor(data = {}) {
        super(data);
            // WARNING: Property "Value" has no type defined.
this.Value = data.Value;
            this.Translation = data.Translation ? [].concat(data.Translation).map(item => new TranslationType(item)) : [];
            this.DataType = data.DataType ? new NodeId(data.DataType) : undefined;
            this.ValueRank = data.ValueRank ? new ValueRank(data.ValueRank) : undefined;
            this.ArrayDimensions = data.ArrayDimensions ? new ArrayDimensions(data.ArrayDimensions) : undefined;
            this.AccessLevel = data.AccessLevel ? new AccessLevel(data.AccessLevel) : undefined;
            this.UserAccessLevel = data.UserAccessLevel ? new AccessLevel(data.UserAccessLevel) : undefined;
            this.MinimumSamplingInterval = data.MinimumSamplingInterval ? new Duration(data.MinimumSamplingInterval) : undefined;
            this.Historizing = data.Historizing;
    }

        static #__xsdMeta = {
    "Value": {
        "xmlName": "Value"
    },
    "Translation": {
        "xmlName": "Translation"
    },
    "DataType": {
        "xmlName": "@_DataType"
    },
    "ValueRank": {
        "xmlName": "@_ValueRank"
    },
    "ArrayDimensions": {
        "xmlName": "@_ArrayDimensions"
    },
    "AccessLevel": {
        "xmlName": "@_AccessLevel"
    },
    "UserAccessLevel": {
        "xmlName": "@_UserAccessLevel"
    },
    "MinimumSamplingInterval": {
        "xmlName": "@_MinimumSamplingInterval"
    },
    "Historizing": {
        "xmlName": "@_Historizing"
    }
};
        static __getXSDMeta() { return this.#__xsdMeta; }
    
}