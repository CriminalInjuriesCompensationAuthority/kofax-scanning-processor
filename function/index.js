'use strict';

require('dotenv').config();
const s3 = require('./services/s3/index');
const createSqsService = require('./services/sqs/index');
const logger = require('./services/logging/logger');

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

    logger.info('Message received from SQS queue: ', response);

    return 'Success!';
}

module.exports = {handler};
