'use strict';

const fs = require('fs');
const {parseMetadata, unescape} = require('./index');

describe('Meatadata service', () => {

    it('Should parse metadata successfully.', async () => {
        const txt = fs.readFileSync('function/resources/testing/meta-with-ref-num.txt').toString();

        const metadata = parseMetadata(txt);

        expect(metadata["FinalRefNo"]).toBe("751262");
    });

    it('Should unescape unescapable string', async () => {
        const string = '"Example"';

        const unescaped = unescape(string);

        expect(unescaped).toBe('Example');
    });

    it('Should return unescaped string for un-unescapable string', async () => {
        const string = '"\\\\10.10.10.12\\kofax-storage-gateway-bucket\\T_BW Scan\\245511\\"';

        const unescaped = unescape(string);

        expect(unescaped).toBe('"\\\\10.10.10.12\\kofax-storage-gateway-bucket\\T_BW Scan\\245511\\"');
    });

});
