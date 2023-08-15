'use strict';

const {GetObjectCommand, S3Client, DeleteObjectCommand} = require('@aws-sdk/client-s3');
const {createReadStream, readFileSync} = require('fs');
const {sdkStreamMixin} = require('@aws-sdk/util-stream-node');
const {mockClient} = require('aws-sdk-client-mock');
const s3 = require('.');

describe('S3 Service', () => {
    const mockS3Client = mockClient(S3Client);

    beforeAll(() => {
        mockS3Client.reset();
    });

    it('Should successfully parse the object from S3 as JSON', async () => {
        const mockCommand = {
            Bucket: 'test',
            Key: 'lorem-ipsum.pdf'
        };
        const stream = createReadStream(
            'function/resources/testing/lorem-ipsum.pdf'
        );
        const sdkStream = sdkStreamMixin(stream);
        mockS3Client.on(GetObjectCommand, mockCommand).resolves({
            Body: sdkStream,
            ContentType: 'application/pdf'
        });

        const response = await s3.retrieveObjectFromBucket('test', 'lorem-ipsum.pdf');
        expect(response).toBeDefined;
    });

    it('Should throw an error if the object/bucket is not found', async () => {
        const mockCommand = {
            Bucket: '8d20901b-ed27-4bae-9884-8c5bb7c89b1c',
            Key: 'lorem-ipsum.pdf'
        };
        mockS3Client
            .on(GetObjectCommand, mockCommand)
            .rejects('The specified bucket does not exist');
        await expect(async () =>
            s3.retrieveObjectFromBucket(
                '8d20901b-ed27-4bae-9884-8c5bb7c89b1c',
                'lorem-ipsum.pdf'
            )
        ).rejects.toThrowError('The specified bucket does not exist');
    });

    it('Should delete an object from a bucket', async () => {
        const mockCommand = {
            Bucket: '8d20901b-ed27-4bae-9884-8c5bb7c89b1c',
            Key: 'lorem-ipsum.pdf'
        };
        mockS3Client.on(DeleteObjectCommand, mockCommand).resolves({
            metadata: 'test',
            DeleteMarker: true
        });

        const response = await s3.deleteObjectFromBucket(
            '8d20901b-ed27-4bae-9884-8c5bb7c89b1c',
            'lorem-ipsum.pdf'
        );
        expect(response?.DeleteMarker).toBeTruthy();
    });
});
