
import { GoogleGenAI } from "@google/genai";
import { QuoteStyle } from "../types";

const STYLE_DESCRIPTIONS: Record<string, string> = {
  [QuoteStyle.SOCIAL]: `Ultra-cinematic lifestyle photography, authentic professional photo. Natural interactions, authentic emotions. Shot on cinema camera, shallow depth of field. Modern editorial style, minimalistic.`,
  [QuoteStyle.MINIMAL]: "Clean, spacious, uncluttered. Simple shapes, soft lighting, and negative space.",
  [QuoteStyle.NATURE]: "Serene natural settings, forests, oceans, or mountains. Breath-taking landscapes.",
  [QuoteStyle.URBAN]: "Gritty or polished cityscapes, street photography, architecture, neon lights.",
  [QuoteStyle.ABSTRACT]: "Artistic patterns, fluid shapes, conceptual colors, non-representational art.",
  [QuoteStyle.CLASSIC]: "Timeless, elegant, sophisticated textures like marble, silk, vintage libraries.",
  [QuoteStyle.CYBERPUNK]: "Futuristic, high-tech, low-life. heavy neon pink and blue saturation.",
  [QuoteStyle.MORNING]: "Soft, warm morning sunlight, ethereal golden glow, serene and optimistic atmosphere. Calm scenery, peaceful and gentle start of the day. Airy composition with a sense of hope and tranquility.",
  [QuoteStyle.DAYTIME]: "Bright, crisp natural afternoon sunlight. Motivational and serene environment with no emotional burden. Poetic and light composition, clear skies, airy spaces, and a feeling of progress and inspiration for a beautiful day."
};

const SYSTEM_INSTRUCTION = `
Semantic Understanding → Image Generation
Ты — система смыслового анализа и визуальной интерпретации текста. Твоя задача — глубоко понять смысл цитаты, прежде чем создавать изображение.

АЛГОРИТМ РАБОТЫ (ОБЯЗАТЕЛЕН):
1. Проанализируй цитату: определи основную мысль, скрытый смысл, эмоциональный тон (спокойствие, тишина, надежда и т.д.).
2. Преобразуй смысл в визуальную метафору: она не должна повторять слова цитаты напрямую, а передавать идею через образ, пространство и свет.
3. Избегай буквального иллюстрирования: не рисуй объекты, прямо названные в цитате. Не используй клише (сердце, часы).
4. Выбери один главный визуальный образ, который лучше всего передаёт смысл цитаты.

КРИТЕРИЙ СООТВЕТСТВИЯ:
Если убрать текст цитаты, изображение всё равно должно передавать её смысл и настроение.

ЗАПРЕТЫ:
– Случайные сцены без связи со смыслом
– Абстракции без читаемого образа
– Текст, буквы или цифры на картинке

РЕЗУЛЬТАТ:
Создай изображение, которое выглядит как визуальный эквивалент смысла цитаты.
`.trim();

export const generateBackgroundImage = async (quote: string, style: QuoteStyle): Promise<string | null> => {
  // Используем актуальный ключ из окружения
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const selectedStyleDescription = STYLE_DESCRIPTIONS[style] || style;

  const prompt = `
    QUOTE TO ANALYZE: "${quote}"
    VISUAL STYLE GUIDELINE: ${selectedStyleDescription}
    
    TASK: Using the "Semantic Understanding" algorithm, generate a professional, high-quality 9:16 background image. Focus on visual metaphor and atmosphere.
    
    REQUIREMENTS:
    - Aspect ratio: 9:16 (vertical).
    - ABSOLUTELY NO TEXT, NO LETTERS, NO NUMBERS on the image itself.
    - Cinematic lighting, professional composition.
  `.trim();

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        imageConfig: {
          aspectRatio: "9:16"
        }
      }
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (error: any) {
    console.error("Image generation error:", error);
    // Обработка случая, когда требуется сброс ключа
    if (error?.message?.includes("Requested entity was not found") || error?.message?.includes("not found")) {
        throw new Error("KEY_RESET");
    }
    return null;
  }
};