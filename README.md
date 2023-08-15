# Kofax Scanning Processor function (Node.js)
This function is set up to run in a lambda environment with the end goals being to insert scanned documents into S3 and trigger a KTA process map.

Key process steps:

- The function is triggered by a scheduled event.
- The function will poll an SQS queue to retereive a document to process.
- The document will be retrieved from its temporary location before processed.
- After processing, the document will be uploaded to S3, and a KTA process map will be called to insert the metadata into the Casework DB.

The project source includes the following directories:

- `function/index.js` - A Node.js which is triggered by a scheduled event.
- `resources/testing` - Various sample data used for testing.
- `function/services/kta` - Supports triggering the KTA process map.
- `function/services/s3` - Supports integration with AWS S3.
- `function/services/secret-manager` - Supports integration with AWS Secrets Manager.
- `function/services/sqs` - Supports integration with AWS SQS.
- `function/services/ssm` - Supports integration with AWS SSM.
- `template.yml` - An AWS CloudFormation template that creates an application.


# Requirements
- [Node.js 18.16.1 or later with npm](https://nodejs.org/en/download/releases/)
- The Bash shell. For Linux and macOS, this is included by default. In Windows 10, you can install the [Windows Subsystem for Linux](https://docs.microsoft.com/en-us/windows/wsl/install-win10) to get a Windows-integrated version of Ubuntu and Bash.
- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)

Not mandatory but useful if using VSCode:
- Prettier formatter extension
- AWS Toolkit extension

# Local development setup

Download or clone this repository.
Add an .env file containing:

   ```
   NODE_ENV = 'local'
   SCANNING_QUEUE='http://localhost:4566/000000000000/scanning-queue'
   ```

Configure local code:
- In `function/index.test.js` unskip the `'Should run the function handler'` test

Configure local AWS environment:

The kofax scanning processor uses localstack for easy setup of AWS services and resources. The setup can be found in the Makefile of this directory.

Once this is done, open this project directory in terminal and run:
 - `make init`
 - `make create-source-bucket`
 - `make create-destination-bucket`
 - `make create-parameters`
 - `make create-queue`

To check the localstack container is running, you can run `docker ps`

Use `npm run test` to run the function handler locally.

The lambda function polls the queue that was created, so in order for it to pick up anything to process, ensure it contains a valid message. A message can be sent using `make send-message` once the queue has been created.

# Test

To run all tests with test coverage, use:
`npx --no-install jest --ci --runInBand --bail --silent --coverage --projects jest.config.js`

To run tests with a debugger attached, use the Run and Debug panel within VS code. The configurations for this can be adjusted in
`.vscode/launch.json`

# Deploy
 
Placeholder

