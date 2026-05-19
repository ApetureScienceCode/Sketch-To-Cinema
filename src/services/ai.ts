import { GoogleGenAI, Type, Modality } from "@google/genai";

// We'll initialize this per call to ensure it uses the latest selected key if needed
const getAI = () => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("API Key not found");
  return new GoogleGenAI({ apiKey });
};

export interface InterpretationResult {
  imagePrompt: string;
  videoPrompt: string;
}

export async function interpretSketch(base64Image: string, userContext?: string): Promise<InterpretationResult> {
  const ai = getAI();
  
  const systemInstruction = `You are an expert AI Creative Director specializing in the "Sketch-to-Cinema" pipeline.
Your goal is to guide the user from a rough hand-drawn sketch to a high-fidelity image (Nano Banana) and finally into a cinematic video (Veo 3).

STAGE 1: SKETCH INTERPRETATION (NANO BANANA)
Given a sketch and optional user-provided context, interpret the spatial layout, geometry, and elements.
Generate a detailed "Nano Banana" image prompt that translates the sketch into a photorealistic or highly-stylized final image.
Focus on: Lighting, Texture, Materiality, and keeping the structural integrity of the user's original drawing.
If user context is provided, prioritize it while maintaining the sketch's structural integrity.

STAGE 2: MOTION SYNTHESIS (VEO 3)
Once the image is conceptualized, generate a "Veo 3" motion prompt.
Describe fluid motion, camera dynamics (pan, tilt, zoom), and atmospheric effects.
Include audio/SFX cues that complement the visual style.
Specify duration (6-10 seconds), aspect ratio (16:9), and frame rate consistency.

Return the response in JSON format.`;

  const promptParts = [
    {
      inlineData: {
        mimeType: "image/png",
        data: base64Image.split(',')[1] || base64Image,
      },
    },
    { text: "Interpret this sketch and provide the Nano Banana image prompt and Veo 3 motion prompt." }
  ];

  if (userContext) {
    promptParts.push({ text: `Additional User Context: ${userContext}` });
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: promptParts,
    },
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          imagePrompt: { type: Type.STRING, description: "Highly detailed prompt for Nano Banana image generation" },
          videoPrompt: { type: Type.STRING, description: "Cinematic motion prompt for Veo 3 video generation" },
        },
        required: ["imagePrompt", "videoPrompt"]
      }
    }
  });

  return JSON.parse(response.text);
}

export async function generateNanoBananaImage(prompt: string): Promise<string> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-image-preview',
    contents: {
      parts: [{ text: prompt }],
    },
    config: {
      imageConfig: {
        aspectRatio: "16:9",
        imageSize: "1K"
      }
    },
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image generated");
}

export async function generateVeoVideo(prompt: string, base64Image: string): Promise<Blob> {
  const ai = getAI();
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  
  // 1. Start video generation operation
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-lite-generate-preview',
    prompt: prompt,
    image: {
      imageBytes: base64Image.split(',')[1] || base64Image,
      mimeType: 'image/png',
    },
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '16:9'
    }
  });

  // 2. Poll for completion
  console.log("Video generation started, operation:", operation.name);
  
  while (!operation.done) {
    console.log("Polling for video generation status...");
    await new Promise(resolve => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({ operation });
  }

  if (operation.error) {
    console.error("Video generation failed with error:", operation.error);
    throw new Error(`Veo Generation Error: ${operation.error.message || JSON.stringify(operation.error)}`);
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) {
    console.error("Operation response missing video URI:", operation.response);
    throw new Error("Video generation failed: No download link provided in response");
  }

  // Ensure alt=media is in the URL to download bytes, not metadata!
  const urlObj = new URL(downloadLink);
  if (!urlObj.searchParams.has('alt')) {
    urlObj.searchParams.set('alt', 'media');
  }

  // Determine the correct auth header
  const fetchHeaders: Record<string, string> = {};
  if (apiKey) {
    if (apiKey.startsWith('eyJ')) {
      fetchHeaders['Authorization'] = `Bearer ${apiKey}`;
    } else {
      fetchHeaders['x-goog-api-key'] = apiKey;
    }
  }

  // 3. Fetch the video file
  console.log("Fetching video from URI:", urlObj.toString());
  const videoResponse = await fetch(urlObj.toString(), {
    method: 'GET',
    headers: Object.keys(fetchHeaders).length > 0 ? fetchHeaders : undefined,
  });

  if (!videoResponse.ok) {
    const errorText = await videoResponse.text();
    console.error("Video fetch failed:", videoResponse.status, errorText);
    throw new Error(`Failed to download video: ${videoResponse.statusText} (${videoResponse.status}). ${errorText}`);
  }

  const blob = await videoResponse.blob();
  return blob;
}
