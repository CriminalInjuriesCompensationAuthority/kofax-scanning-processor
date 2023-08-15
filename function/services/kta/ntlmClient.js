'use strict';

const httpNtlmClient = require('httpntlm');
const getParameter = require('../ssm/index');
const getSecret = require('../secret-manager/index');

const client = {
    async sendRequest(serviceUrl, jsonRequest) {
        const ktaArn = await getParameter('kta-secret-arn');
        const ktaSecret = JSON.parse(await getSecret(ktaArn));

        return new Promise(function(resolve, reject) {
            const opts = {
                username: ktaSecret.username,
                password: ktaSecret.password,
                domain: ktaSecret.domain,
                workstation: '',
                url: ktaSecret.sdkPrefix + serviceUrl,
                json: jsonRequest
            };

            httpNtlmClient.post(opts, function(err, response) {
                if (err) {
                    reject(err);
                } else {
                    const parsedResponse = JSON.parse(response.body);
                    if (parsedResponse.Message) {
                        reject(parsedResponse.Message);
                    } else {
                        resolve(parsedResponse.d);
                    }
                }
            });
        });
    }
};

module.exports = client;
