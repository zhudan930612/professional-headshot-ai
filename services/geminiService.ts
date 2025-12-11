import { GoogleGenAI } from "@google/genai";

// NOTE: In a real environment, this would be used to generate dynamic blog content 
// or analyze user text inputs. For this demo, we expose the structure.

let aiClient: GoogleGenAI | null = null;

const getClient = () => {
  if (!aiClient && process.env.API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return aiClient;
};

export const generateHeadshotTips = async (profession: string): Promise<string> => {
  const ai = getClient();
  if (!ai) {
    console.warn("API_KEY not found in environment.");
    return "Please configure your API Key to use AI features.";
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Give me 3 short, punchy tips for a professional headshot for a ${profession}.`,
    });
    return response.text || "No tips available.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Unable to generate tips at this moment.";
  }
};

// Example of how we would use Imagen if the user provided an API key with access
export const generatePlaceholderImageDescription = async (): Promise<string> => {
    const ai = getClient();
    if (!ai) return "Professional business portrait";

    try {
         const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: "Describe a generic professional headshot for a business person in 10 words.",
          });
          return response.text || "Professional business portrait";
    } catch (e) {
        return "Professional business portrait";
    }
}