import { GoogleGenAI, GenerateContentResponse, LiveServerMessage, Modality, Blob, Chat, Type } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
if (!apiKey) console.error("GEMINI_API_KEY or API_KEY environment variable not set.");
const ai = new GoogleGenAI({ apiKey: apiKey! });

export interface WellnessTipData {
  text: string;
  author?: string;
}

export const getWellnessTip = async (): Promise<WellnessTipData> => {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: "Gere uma 'Inspiração do Dia'. Busque uma citação impactante.",
        config: {
            systemInstruction: `Você é o curador de sabedoria do aplicativo Tranquili+.
            Sua missão é selecionar frases e citações de grandes nomes da Psicologia, Filosofia, Sociologia ou figuras públicas inspiradoras que reflitam calma, autoconhecimento e saúde mental.
            1. O tom deve ser acolhedor.
            2. Se for uma citação real, o campo 'author' DEVE conter o nome da pessoa.
            3. Se você optar por gerar uma dica prática original, o campo 'author' DEVE ser 'Tranquili+'.
            4. A saída DEVE ser um JSON.`,
            temperature: 1.2,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    text: { type: Type.STRING },
                    author: { type: Type.STRING }
                },
                required: ["text", "author"]
            }
        }
    });
    try {
        let jsonText = response.text?.trim() || "";
        if (jsonText.startsWith('```json')) jsonText = jsonText.substring(7, jsonText.length - 3).trim();
        else if (jsonText.startsWith('```')) jsonText = jsonText.substring(3, jsonText.length - 3).trim();
        return JSON.parse(jsonText);
    } catch (e) {
        return { text: "Respire fundo e aprecie o momento presente.", author: "Tranquili+" };
    }
};

export const getQuickResponseStream = async (chat: Chat, prompt: string) => {
  return chat.sendMessageStream({ message: prompt });
};

export const getComplexResponse = async (prompt: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: prompt,
        config: { thinkingConfig: { thinkingBudget: 1024 } }
    });
    return response.text || "";
};

export const getGroundedResponse = async (prompt: string): Promise<GenerateContentResponse> => {
    return await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] },
    });
};

export const getMentalHealthNews = async (topic?: string, count: number = 6, excludeTitles: string[] = []): Promise<GenerateContentResponse> => {
    const subject = topic || "saúde mental, neurociência e psicologia positiva";
    const exclusions = excludeTitles.slice(-15).map(t => `"${t}"`).join(", ");
    const exclusionInstruction = exclusions ? `\nIMPORTANTE: NÃO repita estas notícias já listadas: ${exclusions}.` : "";
    const prompt = `Busque ${count} notícias ou estudos RECENTES sobre: "${subject}".${exclusionInstruction}
    Retorne um array JSON. Estrutura: {title, summary, full_content, tag, image_description, source_url}.`;
    return await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { tools: [{ googleSearch: {} }], temperature: 0.5 },
    });
};

export const getMultimodalResponse = async (prompt: string, imageBase64: string, mimeType: string): Promise<GenerateContentResponse> => {
    return await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: { parts: [{ text: prompt }, { inlineData: { mimeType, data: imageBase64 } }] },
    });
};

export const generateCalmImage = async (prompt: string): Promise<string> => {
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '1:1' },
    });
    return `data:image/jpeg;base64,${response.generatedImages[0].image.imageBytes}`;
};

export const createFlashLiteChat = (): Chat => {
  return ai.chats.create({
    model: 'gemini-flash-lite-latest',
    config: {
      systemInstruction: `Você é a Tranquilinha, uma companheira de IA para o aplicativo Tranquili+. Seu tom é profundamente empático, encorajador e positivo. Sempre termine suas respostas com uma pergunta reflexiva para manter o diálogo.`,
    },
  });
};

export const connectLiveSession = async (callbacks: { onOpen: () => void; onMessage: (message: LiveServerMessage) => void; onError: (e: ErrorEvent) => void; onClose: (e: CloseEvent) => void; }) => {
  return ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
    callbacks: { onopen: callbacks.onOpen, onmessage: callbacks.onMessage, onerror: callbacks.onError, onclose: callbacks.onClose },
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
    },
  });
};

export const generateDilemmaScenarios = async () => {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Crie 5 cenários de "dilema emocional" envolventes para treinar a inteligência emocional. 
        Varie os temas incluindo obrigatoriamente dilemas sobre: honestidade, lealdade, autocrítica, equilíbrio entre vida pessoal e profissional, e saúde mental.
        Retorne como um ARRAY de objetos JSON.`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.INTEGER },
                        character: { type: Type.STRING },
                        emotion: { type: Type.STRING },
                        situation: { type: Type.STRING },
                        choices: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    text: { type: Type.STRING },
                                    consequence: { type: Type.STRING },
                                    outcome: { type: Type.STRING, enum: ['positive', 'negative', 'neutral'] },
                                    scoreChange: { type: Type.INTEGER }
                                },
                                required: ["text", "consequence", "outcome", "scoreChange"]
                            }
                        }
                    },
                    required: ["id", "character", "emotion", "situation", "choices"]
                }
            }
        }
    });
    return JSON.parse(response.text!);
};

export function createPcmBlob(data: Float32Array): Blob {
  const int16 = new Int16Array(data.length);
  for (let i = 0; i < data.length; i++) int16[i] = data[i] * 32768;
  return { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
}

export function decode(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}