'use strict';

const {mockClient} = require('aws-sdk-client-mock');
const {ReceiveMessageCommand, SQSClient, DeleteMessageCommand} = require('@aws-sdk/client-sqs');
const fs = require('fs');
const createSQSService = require('./index');

describe('SQS Service', () => {
    const sqsMock = mockClient(SQSClient);

    it('Should receive a message from the queue', async () => {
        // Arrange
        const testMessage = fs.readFileSync('function/resources/testing/sqs-message.json');
        sqsMock.on(ReceiveMessageCommand).resolves(testMessage);

        // Act
        const sqsService = createSQSService();
        const response = await sqsService.receiveSQS({
            QueueUrl: 'Queue',
            MaxNumberOfMessages: 1
        });

        // Assert
        expect(Object.keys(JSON.parse(response))).toContain('Messages');
    });

    it('Should delete a message from the queue', async () => {
        // Arrange
        sqsMock.on(DeleteMessageCommand).resolves('Message Deleted');

        // Act
        const sqsService = createSQSService();
        const response = await sqsService.deleteSQS({
            QueueUrl: 'Queue',
            ReceiptHandle: 'Receipt Handle'
        });

        // Assert
        expect(response).toBe('Message Deleted');
    });
});
