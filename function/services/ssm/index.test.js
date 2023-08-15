'use strict';

const {mockClient} = require('aws-sdk-client-mock');
const {SSMClient, GetParameterCommand} = require('@aws-sdk/client-ssm');
const getParameter = require('.');

describe('SSM service', () => {
    it('Should throw error when cannot locate secret', async () => {
        delete process.env.NODE_ENV;
        await expect(async () => getParameter('parameter-test')).rejects.toThrow();
    });

    it('Should retrieve secrets from a given secret name when env is test', async () => {
        process.env.NODE_ENV = 'test';
        const mockSSMClient = mockClient(SSMClient);
        mockSSMClient.on(GetParameterCommand).resolves({
            Parameter: {
                Value: 'test'
            }
        });
        const param = await getParameter('parameter-test');
        expect(param).toContain('test');
    });

    it('Should retrieve secrets from a given secret name when env is local', async () => {
        process.env.NODE_ENV = 'local';
        const mockSSMClient = mockClient(SSMClient);
        mockSSMClient.on(GetParameterCommand).resolves({
            Parameter: {
                Value: 'test'
            }
        });
        const param = await getParameter('parameter-test');
        expect(param).toContain('test');
    });
});
