'use strict';

const logger = require('../logging/logger');
const KtaNtlmClient = require('./ntlmClient');

/**
 * JobIdentity CreateJob (string sessionId, ProcessIdentity processIdentity, JobInitialization 	jobInitialization)
 * Creates a new instance (a job) for the specified process map.
 * @param sessionId
 * @param processName
 * @param inputVariables
 * Use Version = 0 or -1 for the latest map version, or specify a particular version
 * You cannot apply a start date if you are using a map name. You must specify a process ID to implement a start date. No start date will start the process on completion (applicable in most CICA cases)
 */
async function createJob(sessionId, processName, inputVariables) {
    logger.info('Calling CreateJob via NTLM client');

    const params = {
        sessionId,
        processIdentity: {
            Id: '',
            Name: processName,
            Version: 0
        },
        jobInitialization: {
            InputVariables: inputVariables,
            StartDate: null
        }
    };

    try {
        return await KtaNtlmClient.sendRequest('JobService.svc/json/CreateJob', params);
    } catch (error) {
        logger.error(error);
        throw error;
    }
}

module.exports = createJob;
