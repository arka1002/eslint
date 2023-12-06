/**
 * @fileoverview Rule to disallow certain object properties
 * @author Will Klein & Eli White
 */

"use strict";

const astUtils = require("./utils/ast-utils");

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

/** @type {import('../shared/types').Rule} */
module.exports = {
    meta: {
        type: "suggestion",

        docs: {
            description: "Disallow certain properties on certain objects",
            recommended: false,
            url: "https://eslint.org/docs/latest/rules/no-restricted-properties"
        },

        schema: {
            type: "array",
            items: {
                anyOf: [ // `object` and `property` are both optional, but at least one of them must be provided.
                    {
                        type: "object",
                        properties: {
                            object: {
                                type: "string"
                            },
                            property: {
                                type: "string"
                            },
                            message: {
                                type: "string"
                            }
                        },
                        additionalProperties: false,
                        required: ["object"]
                    },
                    {
                        type: "object",
                        properties: {
                            object: {
                                type: "string"
                            },
                            property: {
                                type: "string"
                            },
                            message: {
                                type: "string"
                            }
                        },
                        additionalProperties: false,
                        required: ["property"]
                    }
                ]
            },
            uniqueItems: true
        },

        messages: {
            // eslint-disable-next-line eslint-plugin/report-message-format -- Custom message might not end in a period
            restrictedObjectProperty: "'{{objectName}}.{{propertyName}}' is restricted from being used.{{message}}",
            // eslint-disable-next-line eslint-plugin/report-message-format -- Custom message might not end in a period
            restrictedProperty: "'{{propertyName}}' is restricted from being used.{{message}}"
        }
    },

    create(context) {
        const restrictedCalls = context.options;

        if (restrictedCalls.length === 0) {
            return {};
        }

        const restrictedProperties = new Map();
        const globallyRestrictedObjects = new Map();
        const globallyRestrictedProperties = new Map();

        restrictedCalls.forEach(option => {
            const objectName = option.object;
            const propertyName = option.property;

            if (typeof objectName === "undefined") {
                globallyRestrictedProperties.set(propertyName, { message: option.message });
            } else if (typeof propertyName === "undefined") {
                globallyRestrictedObjects.set(objectName, { message: option.message });
            } else {
                if (!restrictedProperties.has(objectName)) {
                    restrictedProperties.set(objectName, new Map());
                }

                restrictedProperties.get(objectName).set(propertyName, {
                    message: option.message
                });
            }
        });
        debugger;

        /**
         * gets the properties which are present in both the map of restricted properties(global or with an object) and in the parsed source code
         * @param {any} restricted they can be either globally restricted or passed with objects
         * @param {string[]} propertyNames the list of properties used in the code
         * @returns {(boolean | { name: string, message: string | undefined }[])} the list of matched properties with their error / warning messages
         */
        function getMatchingProperties(restricted, propertyNames) {
            const matchedProperties = [];

            propertyNames.forEach(property => {
                if (!restricted.has(property)) {
                    return;
                }
                matchedProperties.push({ name: property, ...restricted.get(property) });
            });

            return matchedProperties.length === 0 ? false : matchedProperties;
        }

        /**
         * Checks to see whether a property access is restricted, and reports it if so.
         * @param {ASTNode} node The node to report
         * @param {string} objectName The name of the object
         * @param {string} propertyName The name of the property
         * @returns {undefined}
         */
        function checkPropertyAccess(node, objectName, propertyName) {
            if (propertyName === null) {
                return;
            }
            const matchedObject = restrictedProperties.get(objectName);
            const matchedObjectProperty = matchedObject ? getMatchingProperties(matchedObject, propertyName) : false;
            const globalMatchedObject = globallyRestrictedObjects.get(objectName);
            const globalMatchedProperty = getMatchingProperties(globallyRestrictedProperties, propertyName);

            if (matchedObjectProperty) {
                for (const props of matchedObjectProperty) {
                    const message = props.message ? ` ${props.message}` : "";

                    context.report({
                        node,
                        messageId: "restrictedObjectProperty",
                        data: {
                            objectName,
                            propertyName: props.name,
                            message
                        }
                    });
                }
            } else if (globalMatchedProperty) {
                for (const props of globalMatchedProperty) {
                    const message = props.message ? ` ${props.message}` : "";

                    context.report({
                        node,
                        messageId: "restrictedProperty",
                        data: {
                            propertyName: props.name,
                            message
                        }
                    });
                }
            } else if (globalMatchedObject) {
                const message = globalMatchedObject.message ? ` ${globalMatchedObject.message}` : "";

                context.report({
                    node,
                    messageId: "restrictedObjectProperty",
                    data: {
                        objectName,
                        propertyName: propertyName[0],
                        message
                    }
                });
            }
        }

        return {
            MemberExpression(node) {
                checkPropertyAccess(node, node.object && node.object.name, [astUtils.getStaticPropertyName(node)]);
            },
            ObjectPattern(node) {
                let objectName;

                if (node.parent.type === "VariableDeclarator") {
                    objectName = node.parent.init.name;
                } else if ((node.parent.type === "AssignmentExpression" || node.parent.type === "AssignmentPattern") && node.parent.right.type === "Identifier") {
                    objectName = node.parent.right.name;
                } else {
                    objectName = "";
                }


            }
        };
    }
};
