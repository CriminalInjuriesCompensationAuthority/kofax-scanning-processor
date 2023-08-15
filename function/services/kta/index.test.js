'use strict';

const createJob = require('.');
const KtaNtlmClient = require('./ntlmClient');

describe('KTA Service', () => {
    let spy;

    beforeAll(() => {
        spy = jest.fn();
        spy = jest.spyOn(KtaNtlmClient, 'sendRequest');
    });

    const sessionId = 'D26400A6DA134810BF579A2B27E8E391';
    const inputVars = [
        {Id: 'TARIFF_REFERENCE', Value: '12\\3456789'},
        {Id: 'SUMMARY_URL', Value: 'location/file.pdf'}
    ];

    it('Should call NTLM client successfully.', async () => {
        spy.mockImplementation(() => Promise.resolve('Success'));
        await expect(
            createJob(sessionId, 'Case Work - Application for Compensation', inputVars)
        ).resolves.toBe('Success');
    });

    it('Should fail gracefully.', async () => {
        spy.mockImplementation(() => Promise.reject(new Error('Failure')));
        await expect(
            createJob(sessionId, 'Case Work - Application for Compensation', inputVars)
        ).rejects.toEqual(new Error('Failure'));
    });

    afterAll(() => {
        jest.restoreAllMocks();
    });
});
