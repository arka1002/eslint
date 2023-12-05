export default [
    {
        rules: {
            "no-restricted-properties": ["error", {
                "object": "foo",
                "property": "bad",
            }, {
                "object": "foosh",
                "property": "worse",
            }, {
                "property": "bad",
            }, {
                "property": "worse",
            }]
        }
    }
]
