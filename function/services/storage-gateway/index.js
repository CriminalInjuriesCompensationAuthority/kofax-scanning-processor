'use strict';

const { StorageGatewayClient, RefreshCacheCommand } = require('@aws-sdk/client-storage-gateway');
const AWSXRay = require('aws-xray-sdk');

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

/**
 * Refresh the storage gateway cache
 * @param {string} fileshare - ARN of the storage gateway fileshare
 * @returns the response from the Storage Gateway client
 */
async function refreshCache(fileshare) {
    const input = {
        FileShareARN: fileshare
    };
    const command = new RefreshCacheCommand(input);

    const response = await client.send(command);
    return response;
}

module.exports = refreshCache;
