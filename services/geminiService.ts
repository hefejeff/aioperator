import { GoogleGenAI, Type } from "@google/genai";
import type { EvaluationResult } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

interface ImagePart {
  base64: string;
  mimeType: string;
}

export async function generateText(prompt: string, image: ImagePart | null): Promise<string> {
  try {
    let contents: any;

    if (image) {
      const parts = [
        {
          inlineData: {
            data: image.base64,
            mimeType: image.mimeType,
          },
        },
        { text: prompt },
      ];
      contents = { parts: parts };
    } else {
      contents = prompt;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
    });
    return response.text;
  } catch (error) {
    console.error("Error generating text:", error);
    return "Sorry, I encountered an error while generating a response. Please check the console for details.";
  }
}

export async function evaluateOperatorPerformance(
  taskGoal: string,
  userWorkflow: string,
  image: ImagePart | null
): Promise<EvaluationResult> {
  const systemInstruction = `You are an expert AI Business Process Consultant. Your task is to evaluate a user's proposed workflow for a given business task. The user will provide a text description of their workflow and may provide a visual diagram. Your evaluation should assess the clarity, efficiency, and logical soundness of the flow. Specifically, critique their decisions on what to automate with AI versus what to keep human-in-the-loop. Provide a quantitative score (1-10) and qualitative, constructive feedback to help them improve their design.`;
  
  const userInteractionText = `Evaluate the following proposed workflow:
---
**Task Goal:** ${taskGoal}
---
**User's Workflow Explanation:** ${userWorkflow}
---
${image ? "The user also provided the attached workflow diagram for context.\n---" : ""}
Please provide your evaluation based on the criteria in your instructions.`;

  const parts: any[] = [{ text: userInteractionText }];
  if (image) {
    parts.push({
      inlineData: {
        data: image.base64,
        mimeType: image.mimeType,
      },
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: parts },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: {
              type: Type.INTEGER,
              description: "An integer score from 1 to 10 for the user's workflow design."
            },
            feedback: {
              type: Type.STRING,
              description: "Constructive feedback on the user's workflow, critiquing their choices about AI automation vs. human steps, and providing suggestions for improvement."
            }
          },
          required: ["score", "feedback"],
        },
      },
    });

    const jsonText = response.text.trim();
    const result = JSON.parse(jsonText);
    return result as EvaluationResult;
  } catch (error) {
    console.error("Error evaluating performance:", error);
    return {
      score: 0,
      feedback: "Could not evaluate performance due to an API error. Please check the console.",
    };
  }
}
