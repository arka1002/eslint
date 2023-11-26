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
        debugger;
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
        function fun(mapName, propertyNames) {
            const arr = [];
            propertyNames.forEach(x => {
                if (mapName.has(x)) {
                    arr.push({ name: x, ...mapName.get(x) })
                } else {
                    return
                }
            })
            return arr.length === 0 ? undefined : arr;
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
            const matchedObjectProperty = matchedObject ? fun(matchedObject, propertyName) : undefined;
            const globalMatchedObject = globallyRestrictedObjects.get(objectName);
            const globalMatchedProperty = fun(globallyRestrictedProperties, propertyName);

            if (matchedObjectProperty) {
                for (const props of matchedObjectProperty) {
                    const message = props.message ? ` ${props.message}` : "";

                    context.report({
                        node,
                        messageId: "restrictedObjectProperty",
                        data: {
                            objectName,
                            propertyName: props.name,
                            message: message
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
                            message: message
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
                })
            }
        }

        /**
         * Checks property accesses in a destructuring assignment expression, e.g. `var foo; ({foo} = bar);`
         * @param {ASTNode} node An AssignmentExpression or AssignmentPattern node
         * @returns {undefined}
         */
        function checkDestructuringAssignment(node) {
            debugger;
            if (node.right.type === "Identifier") {
                const objectName = node.right.name;

                if (node.left.type === "ObjectPattern") {
                    checkPropertyAccess(node.left, objectName, astUtils.getAllProperties(node.left.properties))
                }
            }
        }

        return {
            MemberExpression(node) {
                checkPropertyAccess(node, node.object && node.object.name, [astUtils.getStaticPropertyName(node)]);
            },
            VariableDeclarator(node) {
                if (node.init && node.init.type === "Identifier") {
                    const objectName = node.init.name;

                    if (node.id.type === "ObjectPattern") {
                        checkPropertyAccess(node.id, objectName, astUtils.getAllProperties(node.id.properties))
                    }
                }
            },
            AssignmentExpression: checkDestructuringAssignment,
            AssignmentPattern: checkDestructuringAssignment,
            ArrowFunctionExpression: (node) => {
                debugger;
                for (const param of node.params) {
                    if (param.type === "ObjectPattern") {
                        astUtils.getAllProperties(param.properties);
                    } else if (param.type === "AssignmentPattern" && param.left.type === "ObjectPattern") {
                        astUtils.getAllProperties(param.left.properties)
                    }
                }
            }
        };
    }
};
