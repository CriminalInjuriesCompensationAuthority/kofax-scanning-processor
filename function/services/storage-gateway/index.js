'use strict';

const {StorageGatewayClient, RefreshCacheCommand} = require('@aws-sdk/client-storage-gateway');
const AWSXRay = require('aws-xray-sdk');

/**
 * Gets a parameter with a given name using SSM
 * @param {string} secretName - name of secret for parameter
 * @returns value of parameter
 */
async function refreshCache(secretName) {
    AWSXRay.setContextMissingStrategy('IGNORE_ERROR');
    const client = AWSXRay.captureAWSv3Client(
        new StorageGatewayClient({
            region: 'eu-west-2',
            endpoint:
                process.env.NODE_ENV === 'local' || process.env.NODE_ENV === 'test'
                    ? 'http://localhost:4566'
                    : undefined
        })
    );

    const input = {
        FileShareARN: secretName
    };
    const command = new RefreshCacheCommand(input);

    const response = await client.send(command);
    return response;
}

module.exports = refreshCache;
