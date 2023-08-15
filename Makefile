#pip install localstack
#pip install awscli

#Makefile

init:
	docker run --name localstack -p 4566:4566 -e SERVICES=s3 -e DEFAULT_REGION=eu-west-2 localstack/localstack

start:
	docker start localstack

create-source-bucket:
	aws --endpoint-url=http://localhost:4566 s3 mb s3://scanning-source-bucket

create-destination-bucket:
	aws --endpoint-url=http://localhost:4566 s3 mb s3://scanning-destination-bucket

create-parameters:
	aws --endpoint-url=http://localhost:4566 ssm put-parameter --name "source-bucket-name" --value "scanning-source-bucket" --type String
	aws --endpoint-url=http://localhost:4566 ssm put-parameter --name "destination-bucket-name" --value "scanning-destination-bucket" --type String

create-queue:
	aws --endpoint-url=http://localhost:4566 sqs create-queue --queue-name scanning-queue

send-message:
	aws --endpoint-url=http://localhost:4566 sqs send-message --queue-url "http://localhost:4566/000000000000/scanning-queue" --message-body "temp"
