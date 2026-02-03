import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

// Load API key from .env.local directly as a workaround
function getApiKey(): string {
  // First try environment variable
  if (process.env.ANTHROPIC_API_KEY) {
    return process.env.ANTHROPIC_API_KEY;
  }

  // Fallback: read from .env.local file directly
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const match = envContent.match(/ANTHROPIC_API_KEY=(.+)/);
    if (match && match[1]) {
      return match[1].trim();
    }
  } catch (e) {
    console.error('Could not read .env.local:', e);
  }

  throw new Error('ANTHROPIC_API_KEY not found');
}

// Initialize client lazily to ensure env vars are loaded
function getAnthropicClient() {
  const apiKey = getApiKey();
  return new Anthropic({ apiKey });
}

export async function POST(request: NextRequest) {
  try {
    const { type, prompt, context } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Replace placeholders in the prompt with actual context
    let filledPrompt = prompt;
    if (context) {
      if (context.observations) {
        filledPrompt = filledPrompt.replace(/\{\{observations\}\}/g, context.observations);
      }
      if (context.harm) {
        filledPrompt = filledPrompt.replace(/\{\{harm\}\}/g, context.harm);
      }
      if (context.criterion) {
        filledPrompt = filledPrompt.replace(/\{\{criterion\}\}/g, context.criterion);
      }
    }

    const anthropic = getAnthropicClient();
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: filledPrompt,
        },
      ],
    });

    // Extract text from response
    const textContent = message.content.find(block => block.type === 'text');
    const responseText = textContent ? textContent.text : '';

    // Parse the response into individual suggestions (split by newlines)
    const suggestions = responseText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      // Remove any leading bullets, numbers, or dashes
      .map(line => line.replace(/^[-•*]\s*/, '').replace(/^\d+[.)]\s*/, ''));

    return NextResponse.json({
      type,
      suggestions,
    });
  } catch (error) {
    console.error('Error generating suggestions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to generate suggestions', details: errorMessage },
      { status: 500 }
    );
  }
}
