'use strict';

const {mockClient} = require('aws-sdk-client-mock');
const {SecretsManagerClient, GetSecretValueCommand} = require('@aws-sdk/client-secrets-manager');
const getSecret = require('.');

describe('Secret Manager service', () => {
    it('Should retrieve secrets from a given arn', async () => {
        delete process.env.NODE_ENV;
        await expect(async () => getSecret('secret-test')).rejects.toThrow();
    });

    it('Should retrieve secrets from a given arn with profile', async () => {
        process.env.NODE_ENV = 'test';
        const mockSecretsManagerClient = mockClient(SecretsManagerClient);

        mockSecretsManagerClient.on(GetSecretValueCommand).resolves({
            SecretString: 'test'
        });
        const param = await getSecret('secret-test');
        expect(param).toContain('test');
    });
});
