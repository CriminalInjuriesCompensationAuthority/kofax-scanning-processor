'use strict';

const AWSXRay = require('aws-xray-sdk');
const {S3Client, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command, PutObjectCommand} = require('@aws-sdk/client-s3');
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
        const response = await s3Client.send(listCommand);
        keys = response.Contents.map(obj => obj.Key);
    } catch (error) {
        logger.error(error);
        throw error;
    }

    let objects = [];

    for (const key in keys) {
        const s3Obj = await retrieveObjectFromBucket(bucket, keys[key]);
        objects.push({
            Key: keys[key],
            Object: s3Obj
        });
    }

    return objects;
}

/**
 * Puts given file in a given S3 bucket
 * @param {string} bucket - The bucket to put the object in
 * @param {string} object  - The object to be put into S3
 * @param {string} key - The key to be put in S3
 * @param {string} contentType - The type of object to be put in S3 (e.g, application/pdf)
 */
async function putObjectInBucket(bucket, object, key, contentType) {
    const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: object,
        ContentType: contentType,
        ServerSideEncryption: 'aws:kms',
        SSEKMSKeyId: process.env.KMS_KEY
    });

    try {
        const response = await s3Client.send(command);
        return response;
    } catch (err) {
        logger.error(err);
        throw err;
    }
}

/**
 * Deletes object in a given S3 bucket
 * @param {string} bucket - The bucket to delete from
 * @param {string} objectKey - The key to delete
 */
async function deleteObjectFromBucket(bucket, objectKey) {
    const input = {
        Bucket: bucket,
        Key: objectKey
    };
    const command = new DeleteObjectCommand(input);

    try {
        const response = await s3Client.send(command);
        return response;
    } catch (error) {
        logger.error(error);
        throw error;
    }
}

module.exports = {retrieveObjectFromBucket, retrieveObjectsFromBucket, deleteObjectFromBucket, putObjectInBucket};
