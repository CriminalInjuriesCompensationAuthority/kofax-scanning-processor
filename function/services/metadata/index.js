'use strict';

function unescape(str) {
    let parsedStr = str.replace(/(^|[^\\])(\\\\)*\\$/, "$&\\");

    try {
        parsedStr = JSON.parse(parsedStr);
    } catch (e) {
        parsedStr = parsedStr.replace('\\\\', '\\');
        return str;
    }
    return parsedStr;
}

function parseMetadata(meta) {
    const values = meta.split(',');

    let metadata = {};

    for (let i = 0; i < values.length; i++) {
        if (i < values.length - 1) {
            const objKey = unescape(values[i]);
            const value = unescape(values[++i]);
            metadata[objKey] = value;
        }
    }

    return metadata;
}

module.exports = { unescape, parseMetadata };
