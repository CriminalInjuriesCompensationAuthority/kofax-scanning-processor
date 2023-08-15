'use strict';

const {SSMClient, GetParameterCommand} = require('@aws-sdk/client-ssm');
const AWSXRay = require('aws-xray-sdk');

// Gets a parameter with a given name using SSM
async function getParameter(secretName) {
    AWSXRay.setContextMissingStrategy('IGNORE_ERROR');
    const client = AWSXRay.captureAWSv3Client(
        new SSMClient({
            region: 'eu-west-2',
            endpoint:
                process.env.NODE_ENV === 'local' || process.env.NODE_ENV === 'test'
                    ? 'http://localhost:4566'
                    : undefined
        })
    );

    const input = {
        Name: secretName,
        WithDecryption: process.env.NODE_ENV !== 'local' || process.env.NODE_ENV !== 'test'
    };
    const command = new GetParameterCommand(input);

    const response = await client.send(command);
    return response.Parameter.Value;
}

module.exports = getParameter;
