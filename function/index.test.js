'use strict';

const fs = require('fs');
const {handler, parseMetadata, parseLocation} = require('./index');

describe('Kofax scanning processorfunction', () => {
    it.skip('Should run the function handler', async () => {
        jest.setTimeout(60000);
        const response = await handler({}, null);
        expect(response).toContain('Success!');
    });

    it('Should parse metadata successfully.', async () => {
        const txt = fs.readFileSync('function/resources/testing/meta-with-ref-num.txt').toString();

        let testJson = '"\\\\10.10.10.12\\kofax-storage-gateway-bucket\\T_BW Scan\\245511\\"';

        const metadata = parseMetadata(txt);

        expect(metadata["FinalRefNo"]).toBe("751262");
    });

});
