# Production Deployment Guide & Checklist

This document provides step-by-step instructions for deploying PulseCart to AWS and Vercel in a production environment using OIDC (OpenID Connect) for secure, keyless authentication.

---

## 1. AWS Setup

### A. Create the Production DynamoDB Table
Execute the following AWS CLI command in your local terminal (ensure you have the AWS CLI installed and configured with your credentials, e.g., via `aws configure`):

```bash
aws dynamodb create-table \
  --table-name PulseCart \
  --attribute-definitions \
    AttributeName=PK,AttributeType=S \
    AttributeName=SK,AttributeType=S \
    AttributeName=GSI1PK,AttributeType=S \
    AttributeName=GSI1SK,AttributeType=S \
    AttributeName=GSI2PK,AttributeType=S \
    AttributeName=GSI2SK,AttributeType=S \
  --key-schema AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE \
  --global-secondary-indexes "[{\"IndexName\":\"GSI1\",\"KeySchema\":[{\"AttributeName\":\"GSI1PK\",\"KeyType\":\"HASH\"},{\"AttributeName\":\"GSI1SK\",\"KeyType\":\"RANGE\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}},{\"IndexName\":\"GSI2\",\"KeySchema\":[{\"AttributeName\":\"GSI2PK\",\"KeyType\":\"HASH\"},{\"AttributeName\":\"GSI2SK\",\"KeyType\":\"RANGE\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}}]" \
  --billing-mode PAY_PER_REQUEST
```

### B. Enable DynamoDB Streams
1. Open the [AWS DynamoDB Console](https://console.aws.amazon.com/dynamodbv2/).
2. Select **Tables** from the left sidebar and click on **PulseCart**.
3. Navigate to the **Additional settings** tab.
4. Scroll down to the **DynamoDB stream details** section and click **Turn on**.
5. Select **New and old images** as the view type.
6. Click **Turn on stream**.
7. Copy the **Latest stream ARN** (you will need it for the Lambda trigger).

### C. Create and Deploy the Order Confirmation Lambda
1. Compile and pack the Lambda function locally:
   ```bash
   cd lambda/order-confirm
   npm install
   npm run build
   # Compress files (Windows PowerShell)
   Compress-Archive -Path dist, node_modules -DestinationPath lambda.zip -Force
   ```
2. Open the [AWS Lambda Console](https://console.aws.amazon.com/lambda/).
3. Click **Create function** (Author from scratch):
   - **Function name**: `PulseCart-OrderConfirmation-Prod`
   - **Runtime**: **Node.js 20.x**
   - **Role**: Create a new role with basic Lambda permissions.
4. Upload `lambda.zip` using **Upload from -> .zip file** in the Code tab.
5. Set **Handler** under *Runtime settings* to `dist/index.handler`.
6. Add the DynamoDB Stream trigger:
   - Click **Add trigger**, select **DynamoDB**.
   - Paste the copied **Latest stream ARN** and set starting position to **Latest**. Click **Add**.
7. Attach permissions to the Lambda role in the IAM Console:
   - `AWSLambdaBasicExecutionRole`
   - `AmazonDynamoDBFullAccess`
   - `AmazonSESFullAccess`
8. Set Lambda Environment Variables (Configuration -> Environment variables):
   - **Key**: `FROM_EMAIL`
   - **Value**: Your verified SES sender email address.

### D. Configure AWS IAM Role for Vercel OIDC (Keyless Auth)
To allow Vercel to securely communicate with DynamoDB without hardcoding AWS Access Keys:
1. Open the [AWS IAM Console](https://console.aws.amazon.com/iam/).
2. Select **Identity Providers** from the left sidebar, click **Add provider**:
   - **Provider type**: OpenID Connect
   - **Provider URL**: `https://oidc.vercel.com`
   - **Audience**: `https://vercel.com`
   - Click **Add provider**.
3. Select **Roles** from the sidebar, click **Create role**:
   - **Trusted entity type**: Web Identity
   - **Identity provider**: `https://oidc.vercel.com`
   - **Audience**: `https://vercel.com`
   - Click **Next**.
4. Attach permissions: Search for and select **AmazonDynamoDBFullAccess**. Click **Next**.
5. Role name: `PulseCart-VercelDeploymentRole`.
6. Under *Trust relationships*, click **Edit trust policy** and update the condition to match your Vercel username or Team ID:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Principal": {
           "Federated": "arn:aws:iam::<YOUR_AWS_ACCOUNT_ID>:oidc-provider/oidc.vercel.com"
         },
         "Action": "sts:AssumeRoleWithWebIdentity",
         "Condition": {
           "StringEquals": {
             "oidc.vercel.com:aud": "https://vercel.com/<YOUR_VERCEL_TEAM_OR_USERNAME>"
           }
         }
       }
     ]
   }
   ```
7. Click **Update policy** and copy the **Role ARN** (you will need it for Vercel).

### E. Create the Product Image S3 Bucket and Add S3 permissions
1. Open the [AWS S3 Console](https://console.aws.amazon.com/s3/).
2. Click **Create bucket**:
   - **Bucket name**: `pulsecart-product-images-<unique-suffix>` (S3 bucket names must be globally unique).
   - **AWS Region**: Match the region of your DynamoDB table (e.g., `us-east-1`).
   - Keep other settings at their defaults and click **Create bucket**.
3. Open the created bucket, go to the **Permissions** tab.
4. Set up CORS configuration to allow secure direct client uploads:
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["PUT"],
       "AllowedOrigins": ["https://*.vercel.app", "http://localhost:3000"],
       "ExposeHeaders": []
     }
   ]
   ```
5. Attach S3 write/read permissions to the Vercel OIDC deployment role:
   - Open the **PulseCart-VercelDeploymentRole** role in the AWS IAM Console.
   - Attach the **AmazonS3FullAccess** policy (or a scoped policy targeting the new S3 bucket).

---

## 2. Vercel Configuration

### A. Environment Variables to Add
In your Vercel Project Dashboard, navigate to **Settings -> Environment Variables** and add the following keys:

| Variable Name | Description | Example / Note |
| :--- | :--- | :--- |
| `AUTH_SECRET` | Secret key used by Auth.js to sign tokens. | Generate using `openssl rand -hex 32` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID credentials. | Retrieved from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret credentials. | Retrieved from Google Cloud Console |
| `DYNAMODB_TABLE_NAME` | The name of your production DynamoDB table. | `PulseCart` |
| `AWS_REGION` | The region where your database is deployed. | `us-east-1` |
| `AWS_ROLE_ARN` | The ARN of the IAM OIDC Role created in Step 1D. | `arn:aws:iam::1234567890:role/...` |
| `S3_BUCKET_NAME` | S3 bucket name for uploads. (If omitted, uploads fall back to public/uploads). | `pulsecart-product-images` |

### B. Add DynamoDB Integration
Alternatively, you can navigate to the **Vercel Marketplace**, search for **Amazon DynamoDB**, and click **Add Integration** to link Vercel to your AWS account. This will automatically configure the required permissions.

### C. Find Vercel Team ID
If you are deploying under a Vercel Team:
1. Go to your Vercel Dashboard.
2. Select your team from the scope dropdown (top left).
3. Navigate to **Settings -> General**.
4. Scroll to **Team ID** (starts with `team_...`) and copy it.

---

## 3. Google OAuth Redirect Configuration
1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Select your project and navigate to **APIs & Services -> Credentials**.
3. Under *OAuth 2.0 Client IDs*, edit your OAuth Client credentials.
4. Scroll to **Authorized redirect URIs** and append the production callback endpoint:
   ```text
   https://<your-project-slug>.vercel.app/api/auth/callback/google
   ```
5. Save the configuration.

---

## 4. Run the Seeder against Production
To populate the production database table with initial creator drops:
1. Temporarily modify your local `.env.local` to point to production details:
   - Comment out local variables.
   - Set `AWS_REGION=us-east-1` (or your chosen region).
   - Set `DYNAMODB_TABLE_NAME=PulseCart`.
   - Configure your temporary local AWS profile or set `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` to an IAM user having write permissions on the production `PulseCart` table.
2. Execute the seeder:
   ```bash
   npm run seed
   ```
3. Once completed, revert `.env.local` to prevent accidental production writes during local development.

---

## 5. Verify OIDC is Operational
1. Deploy the project to Vercel (`git push` or run `vercel --prod`).
2. Go to the project configuration on Vercel and verify **there are no hardcoded AWS credentials** (`AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY`) in the environment.
3. Access your live website URL, sign in, and view a product drop.
4. Place a test order. If the page completes the transaction and redirects to the order success page, OIDC successfully generated temporary session credentials via AWS STS.
5. Check the CloudWatch Logs for your Lambda function to verify the order confirmation email was dispatched.

---

## 6. Pre-Submission Checklist
Ensure all these items are checked off before submitting the project:

- [ ] **Live URL works**: The Vercel deployment builds and loads successfully.
- [ ] **Auth works**: Users can register and sign in via Google OAuth.
- [ ] **Buy flow works**: Clicking "Buy Now" on active drops decrements inventory atomically, creates order partitions, and navigates to the success screen.
- [ ] **Admin page works**: The Creator Panel displays live drop metrics (stock, order counts, status badges).
- [ ] **Stress test passed**: Local concurrency script verified that 200 simultaneous checkout requests result in exactly 50 purchases with zero oversells.
- [ ] **Architecture diagram ready**: Included an explanation of the single-table DynamoDB layout, Vercel OIDC role delegation, and Lambda email dispatch.
- [ ] **Blog posts published**: Explaining deployment steps and concurrency handling.
- [ ] **Walkthrough video ready**: Recording demonstrating all user actions is under **3 minutes** in length.
