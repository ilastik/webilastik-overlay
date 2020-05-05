const path = require('path');

module.exports = {
    entry: './src/main',
    mode: 'development',
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
            },
        ],
    },
    resolve: {
        extensions: [
            '.ts',
        ],
        modules: ['./node_modules']
    },
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, './build'),
    },
    devtool: "source-map",
};
