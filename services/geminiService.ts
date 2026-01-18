
import { GoogleGenAI, Type } from "@google/genai";
import { CustodyRecord } from "../types";

// Always use process.env.API_KEY directly when initializing the GoogleGenAI client instance for general tasks.
const getAIClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeRisk = async (record: CustodyRecord, lang: string = 'en'): Promise<string> => {
  const ai = getAIClient();
  try {
    const prompt = `Analyze the following police custody record for potential safety risks or rights violations. 
    Focus on gaps in medical checks, detention duration, and suspicious patterns in logs.
    Record: ${JSON.stringify(record)}
    Provide a concise, 2-sentence risk summary for a legal monitor.
    IMPORTANT: Respond entirely in ${lang === 'ta' ? 'Tamil' : 'English'}.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    return response.text || (lang === 'ta' ? "பகுப்பாய்வு கிடைக்கவில்லை." : "Unable to generate risk analysis.");
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return lang === 'ta' ? "சேவை பிழை காரணமாக பகுப்பாய்வு கிடைக்கவில்லை." : "Risk analysis unavailable due to service error.";
  }
};

export interface GroundedResponse {
  text: string;
  sources: { title: string; uri: string }[];
}

export const getCitizenAssistantResponse = async (
  message: string, 
  options: { 
    caseContext?: CustodyRecord, 
    lang?: string, 
    useSearch?: boolean, 
    useMaps?: boolean,
    location?: { latitude: number, longitude: number }
  } = {}
): Promise<GroundedResponse> => {
  const { caseContext, lang = 'en', useSearch = false, useMaps = false, location } = options;
  const ai = getAIClient();
  
  try {
    const contextStr = caseContext 
      ? `The user is asking about a specific case: ${caseContext.detaineeName} (ID: ${caseContext.id}), currently at ${caseContext.policeStation} with status ${caseContext.status}. Detention reason: ${caseContext.reason}.`
      : "The user is browsing the general public records.";

    const prompt = `You are the Custody Lens Rights Assistant, an expert AI legal guide designed to clear all doubts citizens have regarding their legal rights, specifically focusing on police custody, arrest procedures, and detention.
    
    Your goal is to provide "apt rights" - precise, legally accurate, and actionable advice based on constitutional rights (e.g., DK Basu guidelines in India or Miranda rights elsewhere, prioritizing universal human rights).

    Context: ${contextStr}
    User Query: ${message}
    
    Guidelines:
    1. Be Direct and Reassuring: Calm the user and provide clear steps.
    2. Cite Specifics: Mention relevant legal sections (e.g., Section 41A CrPC, Article 22) or guidelines where applicable to build trust.
    3. Clear Doubts: If the user is confused about bail, lawyers, or police conduct, clarify exactly what is permitted by law.
    
    IMPORTANT: Respond entirely in ${lang === 'ta' ? 'Tamil' : 'English'}.`;

    const tools: any[] = [];
    if (useSearch) tools.push({ googleSearch: {} });
    if (useMaps) tools.push({ googleMaps: {} });

    // Maps grounding requires 2.5 series
    const modelName = useMaps ? 'gemini-2.5-flash' : 'gemini-3-flash-preview';

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        tools: tools.length > 0 ? tools : undefined,
        toolConfig: (useMaps && location) ? {
          retrievalConfig: { latLng: location }
        } : undefined
      },
    });

    const text = response.text || "";
    const sources: { title: string; uri: string }[] = [];

    // Extract grounding chunks
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    chunks.forEach((chunk: any) => {
      if (chunk.web) {
        sources.push({ title: chunk.web.title, uri: chunk.web.uri });
      } else if (chunk.maps) {
        sources.push({ title: chunk.maps.title, uri: chunk.maps.uri });
      }
    });

    return { text, sources };
  } catch (error) {
    console.error("Assistant Error:", error);
    return { 
      text: lang === 'ta' ? "மன்னிக்கவும், பிழை ஏற்பட்டது." : "I am sorry, an error occurred.",
      sources: []
    };
  }
};

export const resolveLocationFromCoordinates = async (latitude: number, longitude: number): Promise<string> => {
  const ai = getAIClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: "Identify the precise address, building name, or landmark for this location. Return ONLY the concise address or name, no intro text.",
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: { latitude, longitude }
          }
        }
      }
    });

    return response.text?.trim() || `GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
  } catch (error) {
    console.error("Location Resolution Error:", error);
    return `GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
  }
};

export const generateVisualEvidence = async (prompt: string, size: '1K' | '2K' | '4K' = '1K'): Promise<string> => {
  const ai = getAIClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: [{ text: `A cinematic, realistic legal reconstruction image: ${prompt}. Dark, professional aesthetic, forensic style.` }] },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
          imageSize: size
        }
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data returned");
  } catch (error) {
    console.error("Image Generation Error:", error);
    throw error;
  }
};

export const generateVeoVideo = async (
  prompt: string, 
  imageBase64: string, 
  aspectRatio: '16:9' | '9:16' = '16:9'
): Promise<string> => {
  const ai = getAIClient();
  try {
    // Starting image part for Veo
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      image: {
        imageBytes: imageBase64.split(',')[1] || imageBase64, // Remove data URL prefix
        mimeType: 'image/png',
      },
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: aspectRatio
      }
    });

    // Polling logic
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("Video generation failed - no URI");

    // Fetch MP4 bytes with API key
    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error("Veo Video Generation Error:", error);
    throw error;
  }
};
