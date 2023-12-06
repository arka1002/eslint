export default [
    {
        rules: {
            "no-restricted-properties": ["error", {
                "object": "foo",
                "property": "bad",
            }]
        }
    }
]
