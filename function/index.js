'use strict';

require('dotenv').config();
const s3Service = require('./services/s3/index');
const metadataService = require('./services/metadata/index')
const createSqsService = require('./services/sqs/index');
const getParameter = require('./services/ssm');
const logger = require('./services/logging/logger');
var path = require('path');

function serialize(object) {
    return JSON.stringify(object, null, 2);
}

function parseLocation(response) {
    const body = JSON.parse(response.Messages[0].Body).Records[0];
    

    const bucket = body.s3.bucket.name;
    const key = metadataService.unescape(decodeURIComponent(body.s3.object.key));

    let arr = key.split("\\");
    arr.pop();
    const dir = arr.join("\\");

    return {
        Bucket: bucket,
        Directory: dir
    };
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
    if (!response.Messages) {
        logger.info('No messages received');
        return 'Nothing to process';
    }

    const message = response.Messages[0];
    logger.info('Message received from SQS queue: ', message);

    try {

        const destinationBucketName = await getParameter('kta-bucket-name');

        const scanLocation = parseLocation(response);

        const scannedObjects = await s3Service.retrieveObjectsFromBucket(scanLocation.Bucket, scanLocation.Directory);

        // TODO: Validate Object, ensure there's only two, one .pdf and one.txt
        //       If there's more objects than expected or they're the wrong type, throw an error
        // validateFiles(scannedObjects)

        // Parse Metadata object into JS Object
        const rawMetadata = scannedObjects.find(obj => obj.Key.endsWith('.txt')).Object;
        const meatadataString = await rawMetadata.transformToString();
        const metadata = metadataService.parseMetadata(meatadataString);

        // Get our file for upload
        const scannedDocument = scannedObjects.find(obj => obj.Key.endsWith('.pdf'));

        // Get CRN (if exists) from metadata object
        const refNumber = metadata.FinalRefNo ? `${metadata.FinalRefYear}-${metadata.FinalRefNo}` : undefined;

        // If CRN exists, set it as the prefix, otherwise set a generic holding location
        const prefix = refNumber ?? 'scanned-documents';
        
        // Upload the file to S3
        logger.info(`Uploading ${scannedDocument.Key.split('\\').pop()}. to bucket ${destinationBucketName}`);
        await s3Service.putObjectInBucket(destinationBucketName, scannedDocument.Object, `${prefix}/${scannedDocument.Key.split('\\').pop()}`, 'application/pdf');

        // Delete the original objects from the Storage Gateway bucket
        for (const obj in scannedObjects) {
            logger.info(`Deleting ${scannedObjects[obj].Key} from S3 bucket ${scanLocation.Bucket}`);
            await s3Service.deleteObjectFromBucket(scanLocation.Bucket, scannedObjects[obj].Key);
        }

        logger.info('Call out to KTA SDK');
        const sessionId = await getParameter('kta-session-id');

        const inputVars = [
            // {Id: 'pTARIFF_REFERENCE', Value: extractTariffReference(s3ApplicationData)},
            // {Id: 'pSUMMARY_URL', Value: `s3://${bucketName}/${Object.values(s3Keys)[0]}`}
        ];

        await createJob(sessionId, 'temp', inputVars);
        
    }
    catch (error) {
        logger.error(error);
        throw error;
    }

    return 'Success!';
}

module.exports = { handler, parseLocation };
