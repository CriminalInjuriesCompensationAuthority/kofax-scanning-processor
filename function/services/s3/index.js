'use strict';

const AWSXRay = require('aws-xray-sdk');
const {S3Client, GetObjectCommand, DeleteObjectCommand} = require('@aws-sdk/client-s3');
const logger = require('../logging/logger');

// Creates the S3 Client with a given profile
// TO-DO use local stack instead of personal AWS
AWSXRay.setContextMissingStrategy('IGNORE_ERROR');
const s3Client = AWSXRay.captureAWSv3Client(
    new S3Client({
        region: 'eu-west-2',
        endpoint:
            process.env.NODE_ENV === 'local' || process.env.NODE_ENV === 'test'
                ? 'http://localhost:4566'
                : undefined,
        forcePathStyle: !!(process.env.NODE_ENV === 'local' || process.env.NODE_ENV === 'test')
    })
);

// Gets an object from a bucket based on key
async function retrieveObjectFromBucket(bucket, objectKey) {
    const command = new GetObjectCommand({
        Bucket: bucket,
        Key: objectKey
    });
    try {
        const response = await s3Client.send(command);
        return response.Body;
    } catch (error) {
        logger.error(error);
        throw error;
    }
}

async function deleteObjectFromBucket(bucket, objectKey) {
    const input = {
        Bucket: bucket,
        Key: objectKey
    };
    const command = new DeleteObjectCommand(input);
    return s3Client.send(command);
}

module.exports = {retrieveObjectFromBucket, deleteObjectFromBucket};
