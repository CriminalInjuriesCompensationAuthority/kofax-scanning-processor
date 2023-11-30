'use strict';

const {mockClient} = require('aws-sdk-client-mock');
const { StorageGatewayClient, RefreshCacheCommand } = require('@aws-sdk/client-storage-gateway');
const refreshCache = require('.');

describe('Storage gateway service', () => {

    it('Should refresh cache', async () => {
        const mockSGWClient = mockClient(StorageGatewayClient);
        mockSGWClient.on(RefreshCacheCommand).resolves({});
        const response = await refreshCache({
            FileShareARN: 'arn'
        });
        expect(response).toEqual({});
    });
});
