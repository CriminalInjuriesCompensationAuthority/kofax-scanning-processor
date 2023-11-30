'use strict';

const fs = require('fs');
const { createReadStream } = require('fs');
const { sdkStreamMixin } = require('@aws-sdk/util-stream-node');
const { mockClient } = require('aws-sdk-client-mock');
const { ReceiveMessageCommand, SQSClient } = require('@aws-sdk/client-sqs');
const { S3Client, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');
const { handler, parseLocation, validateFiles } = require('./index');

describe('Kofax scanning processor function', () => {
    const sqsMock = mockClient(SQSClient);

    it.skip('Should run the function handler', async () => {
        const sqsMockMsg = JSON.parse(
            fs.readFileSync('function/resources/testing/sqs-message.json')
        );
        sqsMock.on(ReceiveMessageCommand).resolves(sqsMockMsg);
        const response = await handler({}, null);
        expect(response).toContain('Success!');
    });

    it('Should resolve successfully if there are no messages to consume', async () => {
        sqsMock.on(ReceiveMessageCommand).resolves(undefined);
        const response = await handler({}, null);
        expect(response).toBe('Nothing to process');
    });

    it('Should parse the directory location correctly', async () => {
        const sqsMockMsg = JSON.parse(
            fs.readFileSync('function/resources/testing/sqs-message.json')
        );
        const response = parseLocation(sqsMockMsg.Messages[0]);
        expect(response.Directory).toBe('test-directory/batch-id');
        expect(response.Bucket).toBe('scanning-source-bucket');
    });

    it('Should throw an error if there is not one .pdf and one .txt', async () => {
        const objects = [
            {
                Key: 'T_BW_SCAN/123456/123456.pdf',
                Object: "test"
            },
            {
                Key: 'T_BW_SCAN/123456/123456.pdf',
                Object: "test"
            }
        ];
        expect(() => { validateFiles(objects) }).toThrowError('Wrong file types - must be one txt and one pdf');
    });

    it('Should throw an error if there is only one file', async () => {
        const objects = [
            {
                Key: 'T_BW_SCAN/123456/123456.pdf',
                Object: "test"
            }
        ];
        expect(() => { validateFiles(objects) }).toThrowError('1 files passed in - there should be 2');
    });

    it('Should throw an error if there are more than two files', async () => {
        const objects = [
            {
                Key: 'T_BW_SCAN/123456/123456.pdf',
                Object: "test"
            },
            {
                Key: 'T_BW_SCAN/123456/123456.txt',
                Object: "test"
            },
            {
                Key: 'T_BW_SCAN/123456/123456.pdf',
                Object: "test"
            }
        ];
        expect(() => { validateFiles(objects) }).toThrowError('3 files passed in - there should be 2');
    });
});
