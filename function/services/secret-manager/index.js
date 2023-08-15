'use strict';

const {SecretsManagerClient, GetSecretValueCommand} = require('@aws-sdk/client-secrets-manager');
const AWSXRay = require('aws-xray-sdk');

// Gets a secret given an arn
async function getSecret(arn) {
    AWSXRay.setContextMissingStrategy('IGNORE_ERROR');
    const client = AWSXRay.captureAWSv3Client(
        new SecretsManagerClient({
            region: 'eu-west-2',
            endpoint:
                process.env.NODE_ENV === 'local' || process.env.NODE_ENV === 'test'
                    ? 'http://localhost:4566'
                    : undefined
        })
    );
    const input = {
        SecretId: arn
    };

    const command = new GetSecretValueCommand(input);
    const response = await client.send(command);
    return response.SecretString;
}

module.exports = getSecret;
