'use strict';

require('dotenv').config();
const s3Service = require('./services/s3/index');
const metadataService = require('./services/metadata/index');
const createSqsService = require('./services/sqs/index');
const getParameter = require('./services/ssm');
const logger = require('./services/logging/logger');
const createJob = require('./services/kta/index');

function serialize(object) {
    return JSON.stringify(object, null, 2);
}

function parseLocation(response) {
    const body = JSON.parse(response.Messages[0].Body).Records[0];

    const bucket = body.s3.bucket.name;
    const key = metadataService.unescape(decodeURIComponent(body.s3.object.key));

    const arr = key.split('/');
    arr.pop();
    const dir = arr.join('/');

    return {
        Bucket: bucket,
        Directory: dir.replace('+', ' ')
    };
}

function validateFiles(messageObjects) {
    // check length of message queue is only 2
    if (messageObjects.length !== 2) {
        throw Error(`${messageObjects.length} files passed in - there should be 2`);
    }
    // check one item is a pdf and one is a txt
    if (
        !(messageObjects[0].Key.endsWith('.txt') && messageObjects[1].Key.endsWith('.pdf')) &&
        !(messageObjects[0].Key.endsWith('.pdf') && messageObjects[1].Key.endsWith('.txt'))
    ) {
        throw Error('Wrong file types - must be one txt and one pdf');
    }
}

async function handler(event, context) {
    logger.info(`## CONTEXT: ${serialize(context)}`);
    logger.info(`## EVENT: ${serialize(event)}`);

    const sqsService = createSqsService();

    // Currently the tempus broker is setup to handle one event at a time
    const receiveInput = {
        QueueUrl: process.env.SCANNING_QUEUE,
        MaxNumberOfMessages: 1
    };
    const response = await sqsService.receiveSQS(receiveInput);

    // Return early if there are no messages to consume.
    if (!response?.Messages) {
        logger.info('No messages received');
        return 'Nothing to process';
    }
    const message = response.Messages[0];
    logger.info('Message received from SQS queue: ', message);

    try {
        const scanLocation = parseLocation(response);

        const scannedObjects = await s3Service.retrieveObjectsFromBucket(
            scanLocation.Bucket,
            scanLocation.Directory
        );

        // TODO: Validate Object, ensure there's only two, one .pdf and one.txt
        //       If there's more objects than expected or they're the wrong type, throw an error
        validateFiles(scannedObjects);

        // Parse Metadata object into JS Object
        const rawMetadata = scannedObjects.find(obj => obj.Key.endsWith('.txt')).Object;
        const meatadataString = await rawMetadata.transformToString();
        const metadata = metadataService.parseMetadata(meatadataString);

        // Get our file for upload
        const scannedDocument = scannedObjects.find(obj => obj.Key.endsWith('.pdf'));

        // Default prefix to use for upload key
        let prefix = process.env.DEFAULT_PREFIX;

        // Get CRN (if exists) from metadata object
        const refNumber = metadata.FinalRefNo
            ? `${metadata.FinalRefYear}-${metadata.FinalRefNo}`
            : undefined;

        // If document is un-barcoded and has a reference number, use this as the prefix
        if (!metadata.BarcodeQRSep && refNumber) {
            prefix = refNumber;
        }

        const destinationBucketName = await getParameter('kta-bucket-name');
        const fileName = scannedDocument.Key.split('/').pop();

        // Upload the file to S3
        logger.info(
            `Uploading ${fileName} to bucket ${destinationBucketName}`
        );
        await s3Service.putObjectInBucket(
            destinationBucketName,
            await scannedDocument.Object.transformToByteArray(),
            `${prefix}/${fileName}`,
            'application/pdf'
        );

        if (!(process.env.NODE_ENV === 'local' || process.env.NODE_ENV === 'test')) {
            logger.info('Call out to KTA SDK');
            const sessionId = await getParameter('kta-session-id');
            const inputVars = [
                { Id: 'BARCODE', Value: metadata.BarcodeQRSep ?? '' },
                { Id: 'DOCUMENT_URL', Value: `s3://${destinationBucketName}/${prefix}/${fileName}` },
                { Id: 'INT_REF_YEAR', Value: metadata.FinalRefYear ?? 0 },
                { Id: 'INT_REF_NO', Value: metadata.FinalRefNo ?? 0 },
                { Id: 'BATCH_ID', Value: metadata['{Batch ID}'] ?? '' }
            ];
            logger.info(`InputVars: ${JSON.stringify(inputVars)}`);
            await createJob(sessionId, 'Process AWS scanned document', inputVars);

            if (!process.env.RETAIN_FILES) {
                // Delete the original objects from the Storage Gateway bucket
                logger.info('Deleting objects from S3');
                for (const obj in scannedObjects) {
                    logger.info(`Deleting ${scannedObjects[obj].Key} from S3 bucket ${scanLocation.Bucket}`);
                    await s3Service.deleteObjectFromBucket(scanLocation.Bucket, scannedObjects[obj].Key);
                }
            }
        }
    } catch (error) {
        logger.error(error);
        throw error;
    }

    return 'Success!';
}

module.exports = { handler, parseLocation };
