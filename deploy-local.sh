#!/usr/bin/env bash
# deploy-local.sh: Instant local builds and deployment to Cloud Run bypassing source upload delays.
set -euo pipefail

IMAGE_NAME="us-central1-docker.pkg.dev/aaiiintt/cloud-run-source-deploy/spoke-mcp:latest"

echo "🔄 1. Configuring local Docker authentication for GCP..."
gcloud auth configure-docker us-central1-docker.pkg.dev --quiet

echo "🏗️ 2. Building Docker image locally for linux/amd64 (leveraging layer cache)..."
docker build --platform linux/amd64 -t "$IMAGE_NAME" .

echo "📤 3. Pushing Docker image to Artifact Registry (only uploading code changes)..."
docker push "$IMAGE_NAME"

echo "🚀 4. Deploying container image to Google Cloud Run..."
gcloud run deploy spoke-mcp \
  --image="$IMAGE_NAME" \
  --region=us-central1 \
  --project=aaiiintt \
  --max-instances=10 \
  --memory=512Mi \
  --cpu=1 \
  --port=8080 \
  --service-account=spoke-runtime@aaiiintt.iam.gserviceaccount.com

echo "🎉 Success! Deployment complete."
