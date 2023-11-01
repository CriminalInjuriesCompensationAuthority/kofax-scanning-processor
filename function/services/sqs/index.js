'use strict';

const AWSXRay = require('aws-xray-sdk');
const {SQSClient, ReceiveMessageCommand, DeleteMessageCommand} = require('@aws-sdk/client-sqs');

/** Returns SQS Service object with functions to send, delete and receive messages from a SQS queue */
function createSqsService() {
    AWSXRay.setContextMissingStrategy('IGNORE_ERROR');
    const sqsClient = AWSXRay.captureAWSv3Client(
        new SQSClient({
            region: 'eu-west-2',
            endpoint:
                process.env.NODE_ENV === 'local' || process.env.NODE_ENV === 'test'
                    ? 'http://localhost:4566'
                    : undefined,
            forcePathStyle: !!(process.env.NODE_ENV === 'local' || process.env.NODE_ENV === 'test')
        })
    );

    /**
     * Receives the next message from a given queue
     * @param {object} input - The details of the queue to receive from
     * @returns Message received from the queue
     */
    async function receiveSQS(input) {
        const command = new ReceiveMessageCommand(input);
        const response = await sqsClient.send(command);
        return response;
    }

    /**
     * Deletes a given message from a given SQS queue
     * @param {object} input - Contains the details of the queue and message to delete
     */
    async function deleteSQS(input) {
        const command = new DeleteMessageCommand(input);
        const response = await sqsClient.send(command);
        return response;
    }
    
    return Object.freeze({
        receiveSQS,
        deleteSQS
    });
}

module.exports = createSqsService;
