export default [
    {
        rules: {
            "no-restricted-properties": ["error", {
                "property": "__proto__"
            }]
        }
    }
]