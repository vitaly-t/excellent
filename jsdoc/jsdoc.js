module.exports = {
    source: {
        include: [
            'src',
            'jsdoc/README.md'
        ]
    },
    opts: {
        destination: './API'
    },
    templates: {
        default: {
            layoutFile: './jsdoc/layout.html',
            staticFiles: {
                include: [
                    './jsdoc/style.css'
                ]
            }
        }
    },
    plugins: [
        'plugins/markdown'
    ]
};
