// Copyright 2025 Remy Beraud
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
//     https://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * Ensures that the returned value is an array.
 * Useful for XML parsers that return a single object for one element
 * and an array for multiple elements.
 * @param {any|any[]} item
 * @returns {any[]}
 */
export const ensureArray = (item) => {
    if (!item) return [];
    return Array.isArray(item) ? item : [item];
};

/**
 * Sorts classes based on their dependencies using topological sort.
 * @param {Array<{className: string, dependencies: Set<string>}>} classes
 * @returns {Array} Sorted classes
 */
export function topologicalSort(classes) {
    const sorted = [];
    const visited = new Set();
    const classMap = new Map(classes.map(c => [c.className, c]));

    const visit = (className) => {
        if (visited.has(className)) return;

        const classNode = classMap.get(className);
        // Dependency might be a primitive type or external, so we just return.
        if (!classNode) return;

        visited.add(className);
        classNode.dependencies.forEach(dep => visit(dep));
        sorted.push(classNode);
    };

    classes.forEach(c => visit(c.className));
    return sorted;
}