/**
 * Vertex AI Multimodal Embeddings Service
 * Handles image, video, and audio embeddings using Google Cloud Vertex AI
 */

import { PredictionServiceClient } from "@google-cloud/aiplatform"
import { google } from "@google-cloud/aiplatform/build/protos/protos"

const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || ""
const location = process.env.GOOGLE_CLOUD_LOCATION || "us-central1"
const model = "multimodalembedding@001"

// Initialize Vertex AI client
const predictionClient = new PredictionServiceClient({
  apiEndpoint: `${location}-aiplatform.googleapis.com`,
})

export interface VertexEmbeddingResult {
  embedding: number[]
  dimension: number
}

/**
 * Generate embedding for an image
 * @param imageData - Base64 encoded image data or GCS URI
 * @param dimension - Embedding dimension (128, 256, 512, or 1408)
 */
export async function generateImageEmbedding(
  imageData: string,
  dimension: 128 | 256 | 512 | 1408 = 1408
): Promise<VertexEmbeddingResult> {
  const endpoint = `projects/${projectId}/locations/${location}/publishers/google/models/${model}`

  // Construct the instance with proper protobuf structure
  const instanceValue = {
    structValue: {
      fields: {
        image: {
          structValue: {
            fields: imageData.startsWith("gs://")
              ? {
                  gcsUri: {
                    stringValue: imageData,
                  },
                }
              : {
                  bytesBase64Encoded: {
                    stringValue: imageData,
                  },
                },
          },
        },
      },
    },
  }

  const parametersValue = {
    structValue: {
      fields: {
        dimension: {
          numberValue: dimension,
        },
      },
    },
  }

  const request = {
    endpoint,
    instances: [instanceValue],
    parameters: parametersValue,
  }

  try {
    const [response] = await predictionClient.predict(request as any)
    const predictions = response.predictions

    if (!predictions || predictions.length === 0) {
      throw new Error("No predictions returned from Vertex AI")
    }

    const prediction = predictions[0]
    const imageEmbedding = prediction.structValue?.fields?.imageEmbedding?.listValue?.values?.map(
      (v: any) => v.numberValue
    ) || []

    return {
      embedding: imageEmbedding,
      dimension: imageEmbedding.length,
    }
  } catch (error: any) {
    console.error("Error generating image embedding:", error)
    throw new Error(`Failed to generate image embedding: ${error.message}`)
  }
}

/**
 * Generate embeddings for a video
 * @param videoUri - GCS URI of the video
 * @param startOffsetSec - Start time in seconds (default: 0)
 * @param endOffsetSec - End time in seconds (default: 120)
 * @param intervalSec - Interval for embedding generation (default: 16)
 * @param dimension - Embedding dimension (128, 256, 512, or 1408)
 */
export async function generateVideoEmbeddings(
  videoUri: string,
  startOffsetSec: number = 0,
  endOffsetSec: number = 120,
  intervalSec: number = 16,
  dimension: 128 | 256 | 512 | 1408 = 1408
): Promise<{ embeddings: VertexEmbeddingResult[]; segments: { start: number; end: number }[] }> {
  const endpoint = `projects/${projectId}/locations/${location}/publishers/google/models/${model}`

  // Construct the instance with proper protobuf structure
  const instanceValue = {
    structValue: {
      fields: {
        video: {
          structValue: {
            fields: {
              gcsUri: {
                stringValue: videoUri,
              },
              videoSegmentConfig: {
                structValue: {
                  fields: {
                    startOffsetSec: {
                      numberValue: startOffsetSec,
                    },
                    endOffsetSec: {
                      numberValue: endOffsetSec,
                    },
                    intervalSec: {
                      numberValue: intervalSec,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  }

  const parametersValue = {
    structValue: {
      fields: {
        dimension: {
          numberValue: dimension,
        },
      },
    },
  }

  const request = {
    endpoint,
    instances: [instanceValue],
    parameters: parametersValue,
  }

  try {
    const [response] = await predictionClient.predict(request as any)
    const predictions = response.predictions

    if (!predictions || predictions.length === 0) {
      throw new Error("No predictions returned from Vertex AI")
    }

    const prediction = predictions[0]
    const videoEmbeddings = prediction.structValue?.fields?.videoEmbeddings?.listValue?.values || []

    const embeddings: VertexEmbeddingResult[] = []
    const segments: { start: number; end: number }[] = []

    for (const videoEmb of videoEmbeddings) {
      const embStruct = videoEmb.structValue?.fields
      const embedding = embStruct?.embedding?.listValue?.values?.map(
        (v: any) => v.numberValue
      ) || []
      const startOffset = embStruct?.startOffsetSec?.numberValue || 0
      const endOffset = embStruct?.endOffsetSec?.numberValue || 0

      embeddings.push({
        embedding,
        dimension: embedding.length,
      })

      segments.push({
        start: startOffset,
        end: endOffset,
      })
    }

    return { embeddings, segments }
  } catch (error: any) {
    console.error("Error generating video embeddings:", error)
    throw new Error(`Failed to generate video embeddings: ${error.message}`)
  }
}

/**
 * Generate embedding for combined image and text
 * Useful for contextual image embeddings
 */
export async function generateImageTextEmbedding(
  imageData: string,
  text: string,
  dimension: 128 | 256 | 512 | 1408 = 1408
): Promise<{ imageEmbedding: number[]; textEmbedding: number[] }> {
  const endpoint = `projects/${projectId}/locations/${location}/publishers/google/models/${model}`

  // Construct the instance with proper protobuf structure
  const instanceValue = {
    structValue: {
      fields: {
        image: {
          structValue: {
            fields: imageData.startsWith("gs://")
              ? {
                  gcsUri: {
                    stringValue: imageData,
                  },
                }
              : {
                  bytesBase64Encoded: {
                    stringValue: imageData,
                  },
                },
          },
        },
        text: {
          stringValue: text,
        },
      },
    },
  }

  const parametersValue = {
    structValue: {
      fields: {
        dimension: {
          numberValue: dimension,
        },
      },
    },
  }

  const request = {
    endpoint,
    instances: [instanceValue],
    parameters: parametersValue,
  }

  try {
    const [response] = await predictionClient.predict(request as any)
    const predictions = response.predictions

    if (!predictions || predictions.length === 0) {
      throw new Error("No predictions returned from Vertex AI")
    }

    const prediction = predictions[0]
    const fields = prediction.structValue?.fields

    const imageEmbedding = fields?.imageEmbedding?.listValue?.values?.map(
      (v: any) => v.numberValue
    ) || []

    const textEmbedding = fields?.textEmbedding?.listValue?.values?.map(
      (v: any) => v.numberValue
    ) || []

    return {
      imageEmbedding,
      textEmbedding,
    }
  } catch (error: any) {
    console.error("Error generating image-text embedding:", error)
    throw new Error(`Failed to generate image-text embedding: ${error.message}`)
  }
}

/**
 * Calculate the pricing tier for video embeddings based on interval
 */
export function getVideoEmbeddingTier(intervalSec: number): "Essential" | "Standard" | "Plus" {
  if (intervalSec >= 15) return "Essential"
  if (intervalSec >= 8) return "Standard"
  return "Plus"
}

