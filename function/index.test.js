'use strict';

const fs = require('fs');
const {handler, handleTempusBrokerMessage} = require('./index');

describe('Kofax scanning processorfunction', () => {
    it.skip('Should run the function handler', async () => {
        jest.setTimeout(60000);
        const response = await handler({}, null);
        expect(response).toContain('Success!');
    });
});
