Write-Host "Starting DynamoDB Local on port 8000..."
cmd.exe /c "java -Djava.library.path=./dynamodb_local/DynamoDBLocal_lib -jar ./dynamodb_local/DynamoDBLocal.jar -sharedDb -dbPath ./dynamodb_local -port 8000"
