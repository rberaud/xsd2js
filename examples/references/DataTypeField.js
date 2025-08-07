import { Base } from './Base.js';

import { SymbolicName, NodeId, ValueRank, ArrayDimensions } from './simpleTypes.js';

import { LocalizedText } from './LocalizedText.js';


export class DataTypeField extends Base {
    /**
     * @param {Object} [data]
     */
    constructor(data = {}) {
        super(data);
            this.DisplayName = data.DisplayName ? [].concat(data.DisplayName).map(item => new LocalizedText(item)) : [];
            this.Description = data.Description ? [].concat(data.Description).map(item => new LocalizedText(item)) : [];
            this.Name = data.Name;
            this.SymbolicName = data.SymbolicName ? new SymbolicName(data.SymbolicName) : undefined;
            this.DataType = data.DataType ? new NodeId(data.DataType) : undefined;
            this.ValueRank = data.ValueRank ? new ValueRank(data.ValueRank) : undefined;
            this.ArrayDimensions = data.ArrayDimensions ? new ArrayDimensions(data.ArrayDimensions) : undefined;
            this.MaxStringLength = data.MaxStringLength ? new unsignedInt(data.MaxStringLength) : undefined;
            this.Value = data.Value;
            this.IsOptional = data.IsOptional;
            this.AllowSubTypes = data.AllowSubTypes;
    }

        static #__xsdMeta = {
    "DisplayName": {
        "xmlName": "DisplayName"
    },
    "Description": {
        "xmlName": "Description"
    },
    "Name": {
        "xmlName": "@_Name"
    },
    "SymbolicName": {
        "xmlName": "@_SymbolicName"
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
    "MaxStringLength": {
        "xmlName": "@_MaxStringLength"
    },
    "Value": {
        "xmlName": "@_Value"
    },
    "IsOptional": {
        "xmlName": "@_IsOptional"
    },
    "AllowSubTypes": {
        "xmlName": "@_AllowSubTypes"
    }
};
        static __getXSDMeta() { return this.#__xsdMeta; }
    
}