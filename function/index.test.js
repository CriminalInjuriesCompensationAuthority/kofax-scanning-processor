'use strict';

const fs = require('fs');
const {handler, parseLocation} = require('./index');

describe.only('Kofax scanning processorfunction', () => {
    jest.setTimeout(60000);

    it.only('Should run the function handler', async () => {
        jest.setTimeout(60000);
        const response = await handler({}, null);
        expect(response).toContain('Success!');
    });

    it('Should parse metadata successfully.', async () => {
        const txt = fs.readFileSync('function/resources/testing/meta-with-ref-num.txt').toString();

        const metadata = parseMetadata(txt);

        expect(metadata["FinalRefNo"]).toBe("751262");
    });

    it('Should parse metadata successfully.', async () => {
        const txt = fs.readFileSync('function/resources/testing/meta-with-ref-num.txt').toString();

        const metadata = parseMetadata(txt);

        expect(metadata["FinalRefNo"]).toBe("751262");
    });

});
