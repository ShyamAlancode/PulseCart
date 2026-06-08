if (Test-Path -Path "dynamodb_local") {
    Remove-Item -Recurse -Force -Path "dynamodb_local"
}
New-Item -ItemType Directory -Force -Path "dynamodb_local"
Write-Host "Downloading DynamoDB Local using curl..."
curl.exe -L -o "dynamodb_local_latest.zip" "https://s3.us-west-2.amazonaws.com/dynamodb-local/dynamodb_local_latest.zip"
Write-Host "Extracting DynamoDB Local..."
Expand-Archive -Path "dynamodb_local_latest.zip" -DestinationPath "dynamodb_local" -Force
Remove-Item -Path "dynamodb_local_latest.zip"
Write-Host "DynamoDB Local downloaded and extracted successfully."
