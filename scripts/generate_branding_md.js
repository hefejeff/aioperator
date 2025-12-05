import { GoogleGenAI } from "@google/genai";
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function getApiKey() {
  try {
    const envPath = path.resolve(__dirname, '../.env.local');
    const envContent = await fs.readFile(envPath, 'utf-8');
    const match = envContent.match(/VITE_GOOGLE_AI_API_KEY=(.*)/) || envContent.match(/API_KEY=(.*)/);
    return match ? match[1].trim() : null;
  } catch (e) {
    return process.env.VITE_GOOGLE_AI_API_KEY || process.env.API_KEY;
  }
}

async function main() {
  const apiKey = await getApiKey();
  if (!apiKey) {
    console.error("No API Key found");
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey });

  const pptPath = path.resolve(__dirname, '../docs/2025_westmonroe_powerpointinstructions.pptx');
  const pdfPath = path.resolve(__dirname, '../docs/ppt_quick_start_one_pager.pdf');

  console.log("Reading files...");
  const pptBuffer = await fs.readFile(pptPath);
  const pdfBuffer = await fs.readFile(pdfPath);

  const prompt = `
    You are a brand specialist. Create a comprehensive BRANDING.md file based on the attached West Monroe branding documents.
    
    The output must be a clean, well-structured Markdown file that includes:
    1. **Brand Overview**: Core philosophy and tone.
    2. **Color Palette**: Primary and secondary colors with Hex codes and usage rules.
    3. **Typography**: Font families, hierarchy (Headings, Body), and usage.
    4. **Logo Usage**: Rules for clear space, sizing, and do's/don'ts.
    5. **Imagery**: Style of photography, illustrations, and icons.
    6. **Layout & Composition**: Grid systems, spacing, and slide layouts.
    7. **Voice & Tone**: How to write copy (e.g., "Bold", "Clean", "Data-driven").
    
    Format the output as raw Markdown text. Do not include "Here is the file" chatter.
  `;

  console.log("Generating branding guide...");
  
  const result = await ai.models.generateContent({
    model: "gemini-2.5-pro",
    contents: {
      parts: [
        { text: prompt },
        /*
        {
          inlineData: {
            data: pptBuffer.toString('base64'),
            mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
          }
        },
        */
        {
          inlineData: {
            data: pdfBuffer.toString('base64'),
            mimeType: 'application/pdf'
          }
        }
      ]
    }
  });

  const responseText = result.text;
  const outputPath = path.resolve(__dirname, '../docs/BRANDING.md');
  
  await fs.writeFile(outputPath, responseText);
  console.log(`Successfully created ${outputPath}`);
}

main().catch(console.error);
