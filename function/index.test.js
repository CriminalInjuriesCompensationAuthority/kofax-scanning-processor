'use strict';

const fs = require('fs');
const {createReadStream} = require('fs');
const {sdkStreamMixin} = require('@aws-sdk/util-stream-node');
const {mockClient} = require('aws-sdk-client-mock');
const {ReceiveMessageCommand, SQSClient} = require('@aws-sdk/client-sqs');
const {S3Client, ListObjectsV2Command, GetObjectCommand} = require('@aws-sdk/client-s3');
const {handler} = require('./index');

describe('Kofax scanning processorfunction', () => {
    const sqsMock = mockClient(SQSClient);

    it.skip('Should run the function handler', async () => {
        const sqsMockMsg = JSON.parse(
            fs.readFileSync('function/resources/testing/sqs-message.json')
        );
        sqsMock.on(ReceiveMessageCommand).resolves(sqsMockMsg);
        const response = await handler({}, null);
        expect(response).toContain('Success!');
    });
});

describe('Mocking S3', () => {
    let sqsMock;
    let s3Mock;
    let sqsMockMsg;
    let stream;
    let sdkStream;

    beforeEach(() => {
        sqsMock = mockClient(SQSClient);
        s3Mock = mockClient(S3Client);
        sqsMockMsg = JSON.parse(fs.readFileSync('function/resources/testing/sqs-message.json'));

        stream = createReadStream('function/resources/testing/lorem-ipsum.pdf');
        sdkStream = sdkStreamMixin(stream);

        sqsMock.on(ReceiveMessageCommand).resolves(sqsMockMsg);

        s3Mock.on(GetObjectCommand).resolves({
            Body: sdkStream,
            ContentType: 'application/pdf'
        });
    });

    it('Should throw an error if there is not one .pdf and one .txt', async () => {
        const listObjResponse = {
            Contents: [
                {
                    Key: 'T_BW_SCAN\\123456\\123456.pdf'
                },
                {
                    Key: 'T_BW_SCAN\\123456\\123456.pdf'
                }
            ]
        };
        s3Mock.on(ListObjectsV2Command).resolves(listObjResponse);
        await expect(async () => handler({}, null)).rejects.toThrowError('Wrong file types');
    });

    it('Should throw an error if there is only one file', async () => {
        const listObjResponse = {
            Contents: [
                {
                    Key: 'T_BW_SCAN\\123456\\123456.pdf'
                }
            ]
        };
        s3Mock.on(ListObjectsV2Command).resolves(listObjResponse);
        await expect(async () => handler({}, null)).rejects.toThrowError('');
    });

    it('Should throw an error if there are more than two files', async () => {
        const listObjResponse = {
            Contents: [
                {
                    Key: 'T_BW_SCAN\\123456\\123456.pdf'
                },
                {
                    Key: 'T_BW_SCAN\\123456\\123456.txt'
                },
                {
                    Key: 'T_BW_SCAN\\123456\\123456.pdf'
                }
            ]
        };
        s3Mock.on(ListObjectsV2Command).resolves(listObjResponse);
        await expect(async () => handler({}, null)).rejects.toThrowError('');
    });
});
