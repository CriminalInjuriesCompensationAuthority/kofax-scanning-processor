'use strict';

require('dotenv').config();
const s3Service = require('./services/s3/index');
const metadataService = require('./services/metadata/index');
const createSqsService = require('./services/sqs/index');
const getParameter = require('./services/ssm');
const logger = require('./services/logging/logger');
const createJob = require('./services/kta/index');
const refreshCache = require('./services/storage-gateway');
const { DoesNotExistException } = require('@aws-sdk/client-ssm');

function serialize(object) {
    return JSON.stringify(object, null, 2);
}

/**
 * Parses the base directory for a scan from the PDF input file
 * @param {string} message 
 * @returns a JSON object containing the bucket name as well as the directory of the scan
 */
function parseLocation(message) {
    const body = JSON.parse(message.Body).Records[0];

    const bucket = body.s3.bucket.name;
    const key = metadataService.unescape(decodeURIComponent(body.s3.object.key));

    // remove the portion of the string after the final '/'
    const arr = key.split('/');
    arr.pop();
    const dir = arr.join('/');

    return {
        Bucket: bucket,
        // replace all + with ' ' (space)
        Directory: dir.replace(/\+/g, ' ')
    };
}

/**
 * Throws an error if there isn't exactly one pdf and one txt in list of objs
 * @param {array} messageObjects 
 */
function validateFiles(messageObjects) {
    // check length of message queue is only 2
    if (messageObjects.length === 0) { 
        throw new DoesNotExistException('No objects found');
    } else if (messageObjects.length !== 2) {
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

/**
 * Processes a json message through the Kofax Scanning processor,
 * parsing Metadata and manipulating objects through S3.
 * @param {string} message - The message picked up from the queue
 */
async function processMessage(message) {

    const sqsService = createSqsService();

    logger.info(`Processing message: ${serialize(message)}`);

    try {
        const scanLocation = parseLocation(message);

        const scannedObjects = await s3Service.retrieveObjectsFromBucket(
            scanLocation.Bucket,
            scanLocation.Directory
        );

        // If there's more objects than expected or they're the wrong type, throw an error
        try {
            validateFiles(scannedObjects);
        } catch (error) {

            // If DoesNotExistException, assume already processed and delete the message
            if (error instanceof DoesNotExistException) {
                logger.warn(`Already processed message - possible duplicate`);
                
                const deleteInput = {
                    QueueUrl: process.env.SCANNING_QUEUE,
                    ReceiptHandle: message.ReceiptHandle
                };
                logger.info(`Deleting ${message.MessageId} from sqs queue as no files were found in ${scanLocation.Directory}`);
                await sqsService.deleteSQS(deleteInput);
                return;
            }

            logger.error(error);
            // Return early, this will mean the message doesn't get processed
            // and will eventually move to the DLQ after re-attempting
            return;
        }
        

        // Parse Metadata object
        const rawMetadata = scannedObjects.find(obj => obj.Key.endsWith('.txt')).Object;
        const meatadataString = await rawMetadata.transformToString();
        const metadata = metadataService.parseMetadata(meatadataString);

        logger.info(`Processing batch: ${metadata['{Batch Name}'] ?? 'unknown'}`);

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

        // Only call out to KTA if not testing locally
        if (!(process.env.NODE_ENV === 'local' || process.env.NODE_ENV === 'test')) {
            logger.info('Call out to KTA SDK');
            const sessionId = await getParameter('kta-session-id');
            const inputVars = [
                { Id: 'BARCODE', Value: metadata.BarcodeQRSep ?? '' },
                { Id: 'DOCUMENT_URL', Value: `s3://${destinationBucketName}/${prefix}/${fileName}` },
                { Id: 'INT_REF_YEAR', Value: metadata.FinalRefYear ?? 0 },
                { Id: 'INT_REF_NO', Value: metadata.FinalRefNo ?? 0 },
                { Id: 'BATCH_ID', Value: metadata['{Batch Name}'] ?? '' }
            ];
            logger.info(`InputVars: ${JSON.stringify(inputVars)}`);
            await createJob(sessionId, 'Process AWS scanned document', inputVars);
        }

        if (!process.env.RETAIN_FILES) {
            // Delete the original objects from the Storage Gateway bucket
            logger.info('Deleting objects from S3');
            for (const obj in scannedObjects) {
                logger.info(`Deleting ${scannedObjects[obj].Key} from S3 bucket ${scanLocation.Bucket}`);
                await s3Service.deleteObjectFromBucket(scanLocation.Bucket, scannedObjects[obj].Key);
            }
            // Delete empty directory object
            const directoryToDelete = `${scanLocation.Directory}/`;
            logger.info(`Deleting ${directoryToDelete} from S3 bucket ${scanLocation.Bucket}`);
            await s3Service.deleteObjectFromBucket(scanLocation.Bucket, directoryToDelete);
        }

        // Refresh SGW cache after deletion
        logger.info('Refreshing SGW cache');
        try {
            await refreshCache(process.env.FILESHARE);
        } catch (error) {
            logger.error(error);
        }

        // Finally delete the consumed message from the Tempus Queue
        const deleteInput = {
            QueueUrl: process.env.SCANNING_QUEUE,
            ReceiptHandle: message.ReceiptHandle
        };
        logger.info(`Deleting ${message.MessageId} from sqs queue, relating to batch ${metadata['{Batch Name}'] ?? ''} in ${scanLocation.Directory}`);
        await sqsService.deleteSQS(deleteInput);

    } catch (error) {
        logger.error(error);
        // Return early, this will mean the message doesn't get processed
        // and will eventually move to the DLQ after re-attempting
        return;
    }
}

/**
 * Delay by a set number of miliseconds
 * @param {integer} ms - The number of ms to delay by
 */
async function delay(ms) {
    return await new Promise(resolve => setTimeout(resolve, ms));
}

async function handler(event, context) {
    logger.info(`## CONTEXT: ${serialize(context)}`);
    logger.info(`## EVENT: ${serialize(event)}`);

    const sqsService = createSqsService();

    // Currently the tempus broker is setup to handle one event at a time
    const receiveInput = {
        QueueUrl: process.env.SCANNING_QUEUE,
        MaxNumberOfMessages: 3
    };
    const response = await sqsService.receiveSQS(receiveInput);

    // Return early if there are no messages to consume.
    if (!response?.Messages) {
        logger.info('No messages received');
        return 'Nothing to process';
    }

    for (let message in response.Messages) {
        if (!response.Messages[message]) break;
        await processMessage(response.Messages[message]);

        // We are delaying by 10 seconds in order to spread the load on KTA
        // This isn't great practice, but unfortunately we are limited by KTA's performance
        await delay(10000);
    }

    return 'Success!';
}

module.exports = { handler, parseLocation, validateFiles };
