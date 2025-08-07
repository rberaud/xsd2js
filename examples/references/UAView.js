import { Base } from './Base.js';

import { EventNotifier } from './simpleTypes.js';

import { UAInstance } from './UAInstance.js';


export class UAView extends UAInstance {
    /**
     * @param {Object} [data]
     */
    constructor(data = {}) {
        super(data);
            this.ContainsNoLoops = data.ContainsNoLoops;
            this.EventNotifier = data.EventNotifier ? new EventNotifier(data.EventNotifier) : undefined;
    }

        static #__xsdMeta = {
    "ContainsNoLoops": {
        "xmlName": "@_ContainsNoLoops"
    },
    "EventNotifier": {
        "xmlName": "@_EventNotifier"
    }
};
        static __getXSDMeta() { return this.#__xsdMeta; }
    
}