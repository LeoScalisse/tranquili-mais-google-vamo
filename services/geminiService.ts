import { GoogleGenAI, GenerateContentResponse, LiveServerMessage, Modality, Blob, Chat, Type } from "@google/genai";

// Ensure the API key is available
if (!process.env.API_KEY) {
  console.error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

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
            Sua missão é selecionar frases e citações de grandes nomes da Psicologia (ex: Freud, Jung, Rogers), Filosofia (ex: Estoicismo, Zen), Sociologia (ex: Bauman) ou figuras públicas inspiradoras (artistas, pensadores) que reflitam calma, autoconhecimento e saúde mental.

            Regras:
            1. O tom deve ser acolhedor, profundo ou motivador.
            2. Se for uma citação real, o campo 'author' DEVE conter o nome da pessoa.
            3. Se você optar por gerar uma dica prática de autocuidado ou uma frase original inventada por você, o campo 'author' DEVE ser estritamente 'Tranquili+'.
            4. A saída DEVE ser um JSON.`,
            temperature: 1.2, // Higher temperature for variety
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    text: { 
                        type: Type.STRING, 
                        description: "O conteúdo da frase ou citação." 
                    },
                    author: { 
                        type: Type.STRING, 
                        description: "Nome do autor real ou 'Tranquili+' se for uma dica gerada." 
                    }
                },
                required: ["text", "author"]
            }
        }
    });

    try {
        let jsonText = response.text.trim();
        if (jsonText.startsWith('```json')) {
            jsonText = jsonText.substring(7, jsonText.length - 3).trim();
        } else if (jsonText.startsWith('```')) {
            jsonText = jsonText.substring(3, jsonText.length - 3).trim();
        }
        return JSON.parse(jsonText);
    } catch (e) {
        console.error("Failed to parse tip JSON", e);
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
    return response.text;
};

export const getGroundedResponse = async (prompt: string): Promise<GenerateContentResponse> => {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }],
        },
    });
    return response;
};

export const getMentalHealthNews = async (topic?: string, count: number = 6, excludeTitles: string[] = []): Promise<GenerateContentResponse> => {
    const subject = topic || "saúde mental, neurociência e psicologia positiva";
    
    // Limit excluded titles to avoid huge prompts, keeping context fresh
    const exclusions = excludeTitles.slice(-15).map(t => `"${t}"`).join(", ");
    const exclusionInstruction = exclusions ? `\nIMPORTANTE: NÃO repita estas notícias já listadas: ${exclusions}.` : "";
    
    // Prompt otimizado para velocidade, estrutura JSON estrita e descrição de imagem
    // Uses 'count' to determine batch size
    const prompt = `Busque ${count} notícias, estudos ou descobertas RECENTES (2024-2025) sobre: "${subject}".${exclusionInstruction}
    
    Retorne APENAS um array JSON puro (sem markdown).
    Estrutura obrigatória de cada objeto:
    [
      {
        "title": "Título curto e atraente (max 50 chars)",
        "summary": "Resumo em 1 frase (max 100 chars)",
        "full_content": "Texto explicativo detalhado (2-3 parágrafos) sobre o estudo/notícia. Inclua contexto e aplicação prática.",
        "tag": "Categoria curta (ex: Estudo, Dica, Cérebro)",
        "image_description": "Uma descrição visual rica, artistica e detalhada EM INGLÊS para gerar uma imagem sobre este tema (ex: 'cinematic shot of glowing neural networks in blue light', 'peaceful woman meditating in sunrise nature', 'abstract representation of anxiety clearing up').",
        "source_url": "URL da fonte original se disponível no grounding, senão null"
      }
    ]`;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }],
            temperature: 0.5, // Increased slightly to avoid repetition
        },
    });
    return response;
};

export const getMultimodalResponse = async (prompt: string, imageBase64: string, mimeType: string): Promise<GenerateContentResponse> => {
    const imagePart = {
        inlineData: {
            mimeType,
            data: imageBase64,
        },
    };
    const textPart = { text: prompt };
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: { parts: [textPart, imagePart] },
    });
    return response;
};

export const generateCalmImage = async (prompt: string): Promise<string> => {
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: '1:1',
        },
    });

    const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
    return `data:image/jpeg;base64,${base64ImageBytes}`;
};

export const createFlashLiteChat = (): Chat => {
  return ai.chats.create({
    model: 'gemini-flash-lite-latest',
    config: {
      systemInstruction: `Você é a Tranquilinha, uma companheira de IA para o aplicativo Tranquili+. Seu tom é profundamente empático, encorajador e positivo.
      Sempre termine suas respostas com uma pergunta reflexiva para manter o diálogo.`,
    },
  });
};

export const connectLiveSession = async (
  callbacks: {
    onOpen: () => void;
    onMessage: (message: LiveServerMessage) => void;
    onError: (e: ErrorEvent) => void;
    onClose: (e: CloseEvent) => void;
  }
) => {
  const liveAi = new GoogleGenAI({ apiKey: process.env.API_KEY! });
  return liveAi.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
    callbacks: {
      onopen: callbacks.onOpen,
      onmessage: callbacks.onMessage,
      onerror: callbacks.onError,
      onclose: callbacks.onClose,
    },
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
      },
    },
  });
};

export const generateDilemmaScenario = async () => {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: "Crie um novo cenário para um jogo de dilemas emocionais. O cenário deve ser relacionável e focado em inteligência emocional.",
        config: {
            responseMimeType: "application/json",
            responseSchema: {
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
                            }
                        }
                    }
                }
            }
        }
    });
    return JSON.parse(response.text);
};

// --- Audio Helpers ---
export function createPcmBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

export function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
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