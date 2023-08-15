'use strict';

const config = {
    testTimeout: 20000,
    transformIgnorePatterns: ['/dist/.+\\.js']
};

config.coverageThreshold = {
    global: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80
    }
};

module.exports = config;
