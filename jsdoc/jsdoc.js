module.exports = {
    source: {
        include: [
            'src'
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
