import { Base } from './Base.js';

import { NodeId, ValueRank, ArrayDimensions } from './simpleTypes.js';

import { UAType } from './UAType.js';


export class UAVariableType extends UAType {
    /**
     * @param {Object} [data]
     */
    constructor(data = {}) {
        super(data);
            // WARNING: Property "Value" has no type defined.
this.Value = data.Value;
            this.DataType = data.DataType ? new NodeId(data.DataType) : undefined;
            this.ValueRank = data.ValueRank ? new ValueRank(data.ValueRank) : undefined;
            this.ArrayDimensions = data.ArrayDimensions ? new ArrayDimensions(data.ArrayDimensions) : undefined;
    }

        static #__xsdMeta = {
    "Value": {
        "xmlName": "Value"
    },
    "DataType": {
        "xmlName": "@_DataType"
    },
    "ValueRank": {
        "xmlName": "@_ValueRank"
    },
    "ArrayDimensions": {
        "xmlName": "@_ArrayDimensions"
    }
};
        static __getXSDMeta() { return this.#__xsdMeta; }
    
}