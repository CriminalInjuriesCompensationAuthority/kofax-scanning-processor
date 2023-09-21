'use strict';

const fs = require('fs');
const {handler} = require('./index');

describe('Kofax scanning processorfunction', () => {

    it.skip('Should run the function handler', async () => {
        const response = await handler({}, null);
        expect(response).toContain('Success!');
    });
});
