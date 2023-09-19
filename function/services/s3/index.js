'use strict';

const AWSXRay = require('aws-xray-sdk');
const {S3Client, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command} = require('@aws-sdk/client-s3');
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

// Gets multiple object from a bucket based on a given prefix
async function retrieveObjectsFromBucket(bucket, objectPrefix) {
    const listCommand = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: objectPrefix
    });

    let keys;
    try {
        const response = await s3Client.send(command);
        keys = response.Contents.map(obj => obj.Key);
    } catch (error) {
        logger.error(error);
        throw error;
    }

    let objects = [];

    for (const key in keys) {
        const s3Obj = await retrieveObjectFromBucket(bucket, key);
        objects.push({
            Key: key,
            Object: s3Obj
        });
    }

    return objects;
}

async function deleteObjectFromBucket(bucket, objectKey) {
    const input = {
        Bucket: bucket,
        Key: objectKey
    };
    const command = new DeleteObjectCommand(input);
    return s3Client.send(command);
}

module.exports = {retrieveObjectFromBucket, retrieveObjectsFromBucket, deleteObjectFromBucket};
