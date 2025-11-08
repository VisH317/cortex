# Vertex AI Multimodal Embeddings Setup

This guide walks you through setting up Google Cloud Vertex AI for multimodal embeddings (images, audio, and video).

## Prerequisites

1. A Google Cloud account
2. A Google Cloud project
3. Billing enabled on your project

## Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter a project name (e.g., "synapsevault-embeddings")
4. Note your Project ID (you'll need this later)

## Step 2: Enable Required APIs

Run the following commands in Google Cloud Shell or your local terminal (with gcloud CLI installed):

```bash
# Set your project
gcloud config set project YOUR_PROJECT_ID

# Enable Vertex AI API
gcloud services enable aiplatform.googleapis.com

# Enable Cloud Storage API (for video/audio files)
gcloud services enable storage-api.googleapis.com
```

## Step 3: Create a Service Account

```bash
# Create service account
gcloud iam service-accounts create synapsevault-embeddings \
    --display-name="SynapseVault Embeddings Service Account"

# Grant Vertex AI User role
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:synapsevault-embeddings@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/aiplatform.user"

# Grant Storage Admin role (for uploading videos/audio)
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:synapsevault-embeddings@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/storage.admin"
```

## Step 4: Download Service Account Key

```bash
# Download the key file
gcloud iam service-accounts keys create ~/synapsevault-key.json \
    --iam-account=synapsevault-embeddings@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

**Important**: Keep this key file secure and never commit it to version control!

## Step 5: Configure Environment Variables

Add the following to your `.env.local` file:

```bash
# Google Cloud Vertex AI Configuration
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/synapsevault-key.json

# Supabase Storage Bucket (must match your Supabase bucket name)
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=files
```

### Supported Regions

Vertex AI is available in the following regions:
- `us-central1` (recommended)
- `us-west1`
- `us-east4`
- `europe-west2`
- `asia-northeast3`

For the full list, see [Vertex AI locations](https://cloud.google.com/vertex-ai/docs/general/locations).

## Step 6: Set Up Supabase Storage for GCS Access

### Option A: Using Supabase Storage (Recommended)

This approach uses your existing Supabase storage. The system constructs GCS URIs from your storage paths.

**No additional setup required** - the code will automatically construct GCS URIs like:
```
gs://your-bucket-name/user-id/file-id/filename.mp4
```

### Option B: Direct Google Cloud Storage

If you want to use Google Cloud Storage directly:

1. Create a GCS bucket:
```bash
gcloud storage buckets create gs://synapsevault-media \
    --location=us-central1
```

2. Update your code to upload audio/video files directly to GCS instead of Supabase Storage.

## Step 7: Test the Setup

Create a test script `test-vertex.js`:

```javascript
const { PredictionServiceClient } = require("@google-cloud/aiplatform")

const projectId = "your-project-id"
const location = "us-central1"
const model = "multimodalembedding@001"

const client = new PredictionServiceClient({
  apiEndpoint: `${location}-aiplatform.googleapis.com`,
})

async function testEmbedding() {
  const endpoint = `projects/${projectId}/locations/${location}/publishers/google/models/${model}`
  
  const instance = {
    text: "Hello, Vertex AI!",
  }

  const request = {
    endpoint,
    instances: [{ structValue: { fields: { text: { stringValue: instance.text } } } }],
  }

  try {
    const [response] = await client.predict(request)
    console.log("✅ Vertex AI is working!")
    console.log("Embedding dimension:", response.predictions[0].structValue.fields.textEmbedding.listValue.values.length)
  } catch (error) {
    console.error("❌ Error:", error.message)
  }
}

testEmbedding()
```

Run it:
```bash
node test-vertex.js
```

## Supported File Types

### Images
- **Formats**: BMP, GIF, JPG, PNG
- **Max Size**: 20 MB
- **Processing**: Converted to base64 and sent to Vertex AI
- **Embedding Dimension**: 1408

### Videos
- **Formats**: AVI, FLV, MKV, MOV, MP4, MPEG, MPG, WEBM, WMV
- **Max Length**: No limit (first 2 minutes analyzed)
- **Segment Intervals**: 
  - Essential: 15+ seconds (lower cost)
  - Standard: 8-15 seconds (balanced)
  - Plus: 4-8 seconds (highest quality)
- **Processing**: Requires GCS URI
- **Embedding**: One per segment

### Audio
- **Formats**: MP3, WAV, OGG, WebM Audio
- **Processing**: Treated as video (Vertex AI video model processes audio)
- **Segment Intervals**: 16 seconds (Essential tier)
- **Processing**: Requires GCS URI

## Pricing

### Image Embeddings
- $0.00025 per image

### Video Embeddings
Based on the mode (determined by interval):
- **Essential** (≥15s intervals): ~$0.0002 per segment
- **Standard** (8-15s intervals): ~$0.0004 per segment  
- **Plus** (4-8s intervals): ~$0.0008 per segment

For a 2-minute video:
- Essential (16s intervals): 7-8 segments = ~$0.0016
- Standard (10s intervals): 12 segments = ~$0.0048
- Plus (6s intervals): 20 segments = ~$0.016

### Cost Comparison

**100 files mix:**
- 40 images: 40 × $0.00025 = $0.01
- 30 audio files (2 min each): 30 × 8 segments × $0.0002 = $0.048
- 30 videos (2 min each): 30 × 12 segments × $0.0004 = $0.144

**Total**: ~$0.20 for 100 mixed media files

For detailed pricing, see [Vertex AI pricing](https://cloud.google.com/vertex-ai/pricing).

## Troubleshooting

### Error: "Permission denied"

Check your service account has the correct roles:
```bash
gcloud projects get-iam-policy YOUR_PROJECT_ID \
    --flatten="bindings[].members" \
    --filter="bindings.members:serviceAccount:synapsevault-embeddings@*"
```

### Error: "Quota exceeded"

Request a quota increase:
1. Go to [IAM & Admin → Quotas](https://console.cloud.google.com/iam-admin/quotas)
2. Filter: `aiplatform.googleapis.com/online_prediction_requests_per_base_model`
3. Select `multimodalembedding`
4. Click "EDIT QUOTAS" and request an increase

### Error: "Invalid GCS URI"

Ensure your GCS URIs are in the format:
```
gs://bucket-name/path/to/file.mp4
```

### Error: "Video/audio file not found"

For Supabase Storage, ensure you're constructing the correct bucket name:
- Check `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` environment variable
- Verify the file exists in Supabase Storage

## Best Practices

1. **Batch Processing**: Process multiple files in parallel when possible
2. **Error Handling**: Always implement retry logic for transient errors
3. **Cost Optimization**: 
   - Use Essential tier (16s intervals) for audio
   - Use Standard tier (10s intervals) for video
   - Only process first 2 minutes unless full content is needed
4. **Monitoring**: Set up Cloud Monitoring alerts for quota usage
5. **Security**: 
   - Never commit service account keys to git
   - Use environment variables for all credentials
   - Rotate service account keys regularly

## Next Steps

- [Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs/generative-ai/embeddings/get-multimodal-embeddings)
- [Multimodal Embeddings Best Practices](https://cloud.google.com/vertex-ai/docs/generative-ai/embeddings/get-multimodal-embeddings#best-practices)
- [Pricing Calculator](https://cloud.google.com/products/calculator)

