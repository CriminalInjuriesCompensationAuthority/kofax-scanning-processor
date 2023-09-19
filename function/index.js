'use strict';

require('dotenv').config();
const s3 = require('./services/s3/index');
const createSqsService = require('./services/sqs/index');
const logger = require('./services/logging/logger');
const { P } = require('pino');

function parseLocation(response) {
    const body = JSON.parse(response.Messages[0].Body.Records[0]);

    const bucket = body.s3.bucket.name;
    const key = body.s3.object.key;

    const dir = key.split("/").pop().join();

    return {
        Bucket: bucket,
        Directory: dir
    };
}

function parseMetadata(meta) {
    const values = meta.split(',');

    let metadata = {};

    for (let i = 0; i < values.length; i++) {
        if (i < values.length - 1) {
            const objKey = JSON.parse(values[i]);
            const value = JSON.parse(values[++i]);
            metadata[objKey] = value;
        }        
    }

    return metadata;
}

async function handler(event, context) {

    logger.info(`## CONTEXT: ${serialize(context)}`);
    logger.info(`## EVENT: ${serialize(event)}`);

    const sqsService = createSqsService();
    const s3Service = createS3Service();

    // Currently the tempus broker is setup to handle one event at a time
    const receiveInput = {
        QueueUrl: process.env.SCANNING_QUEUE,
        MaxNumberOfMessages: 1
    };
    const response = await sqsService.receiveSQS(receiveInput);

    logger.info('Message received from SQS queue: ', response);

    try {

        const destinationBucketName = await getParameter('kta-bucket-name');

        const scanLocation = parseLocation(response);

        if (!(process.env.NODE_ENV === 'local' || process.env.NODE_ENV === 'test')) {

            var scannedObjects = s3Service.GetObjectsFromBucket(scanLocation.Bucket, scanLocation.Directory);

            // TODO: Validate Object, ensure there's only two, one .pdf and one.txt
            // validateFiles(scannedObjects)

            // TODO: Parse Metadata object into JS Object
            const metadata = parseMetadata(scannedObjects.find(obj => obj.Key.endsWith('.txt')).Body.transformToString());


            // TODO: Get CRN (if exists) from metadata object
            // const refNumber = `${metadata.REF_YEAR}-${metadata.REF_NUM}`

            // TODO: If CRN Exists, upload the PDF document to that bucket
            // await s3Service.putInS3(destinationBucketName, destinationBucketName, scanLocation.Directory, scannedObjects.where(file extension is pdf))
            // TODO: If CRN doesn't exist, put it somewhere generic
            // await s3Service.putInS3(destinationBucketName, destinationBucketName, genericDirectory, scannedObjects.where(file extension is pdf))

            // TODO: Delete the original from the source S3 bucket
            // logger.info('Deleting object from S3');
            // await s3.deleteObjectFromBucket(bucketName, Object.values(s3Keys)[1]);

            logger.info('Call out to KTA SDK');
            const sessionId = await getParameter('kta-session-id');

            const inputVars = [
                // {Id: 'pTARIFF_REFERENCE', Value: extractTariffReference(s3ApplicationData)},
                // {Id: 'pSUMMARY_URL', Value: `s3://${bucketName}/${Object.values(s3Keys)[0]}`}
            ];

            await createJob(sessionId, 'temp', inputVars);
        }
    }
    catch (error) {
        logger.error(error);
        throw error;
    }

    return 'Success!';
}

module.exports = { handler, parseMetadata, parseLocation };
