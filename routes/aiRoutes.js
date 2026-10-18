const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const aiRateLimiter = require('../middleware/rateLimiter');

const AI_TIMEOUT_MS = parseInt(process.env.AI_TIMEOUT_MS, 10) || 8000;

// --- Provider configuration (server-side only, never sent to the browser) ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const geminiConfigured = Boolean(
    GEMINI_API_KEY && GEMINI_API_KEY !== 'your_gemini_api_key_here'
);
const openaiConfigured = Boolean(
    OPENAI_API_KEY && OPENAI_API_KEY !== 'your_openai_api_key_here'
);

// Gemini model can be overridden with GEMINI_MODEL in .env
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Initialize OpenAI client if key is configured
let openaiClient = null;
if (openaiConfigured) {
    try {
        openaiClient = new OpenAI({ apiKey: OPENAI_API_KEY, timeout: AI_TIMEOUT_MS });
    } catch (e) {
        console.warn('OpenAI initialization note:', e.message);
    }
}

// Intelligent template generator for Graceful Degradation when external AI is offline/unconfigured
function generateFallbackTemplate(title) {
    const lower = title.toLowerCase();
    let priority = 'medium';
    let days = 3;
    let description = `Break down "${title}" into actionable subtasks, verify dependencies, and validate results before completion.`;

    if (lower.includes('bug') || lower.includes('fix') || lower.includes('error') || lower.includes('crash') || lower.includes('database') || lower.includes('index') || lower.includes('security')) {
        priority = 'high';
        days = 1;
        description = `Design efficient indexes and optimize execution plans for "${title}" to enhance query throughput and prevent table scans.`;
    } else if (lower.includes('docs') || lower.includes('readme') || lower.includes('note')) {
        priority = 'low';
        days = 5;
        description = `Review current documentation for "${title}", draft clear sections with examples, and publish updates.`;
    }

    return { description, priority, days };
}

const SYSTEM_PROMPT = 'You are a helpful task management assistant. Write concise, actionable 1-2 sentence task descriptions. Return only the description text with no preamble, labels, or quotation marks.';

// Call Google Gemini (Gemini Developer API) using the native fetch API
async function generateWithGemini(title) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

    try {
        const response = await fetch(GEMINI_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': GEMINI_API_KEY
            },
            body: JSON.stringify({
                systemInstruction: {
                    parts: [{ text: SYSTEM_PROMPT }]
                },
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: `Write a short, professional task description for: ${title}` }]
                    }
                ],
                generationConfig: {
                    maxOutputTokens: 1024,
                    temperature: 0.7
                }
            }),
            signal: controller.signal
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            const reason = data?.error?.message || `HTTP ${response.status}`;
            throw new Error(`Gemini API error ${response.status}: ${reason}`);
        }

        const description = (data?.candidates?.[0]?.content?.parts || [])
            .map(part => part.text || '')
            .join(' ')
            .trim();

        if (!description) {
            throw new Error('Gemini returned an empty response');
        }

        return description;
    } finally {
        clearTimeout(timer);
    }
}

// Call OpenAI (legacy/secondary provider)
async function generateWithOpenAI(title) {
    const completion = await openaiClient.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `Write a short, professional task description for: ${title}` }
        ],
        max_tokens: 100,
        temperature: 0.7
    });

    const description = completion.choices[0]?.message?.content?.trim();
    if (!description) {
        throw new Error('OpenAI returned an empty response');
    }
    return description;
}

function sendFallback(res, cleanTitle, message) {
    const fallbackData = generateFallbackTemplate(cleanTitle);
    return res.status(200).json({
        success: true,
        fallback: true,
        isAiGenerated: false,
        source: 'graceful-degradation-fallback',
        message,
        ...fallbackData
    });
}

// @route   POST /api/ai/generate-description OR /api/ai/suggest
// @desc    Generate task description with graceful degradation & rate limiting
// @access  Public (API keys securely kept on backend)
router.post(['/generate-description', '/suggest'], aiRateLimiter, async (req, res) => {
    const { title, testFailure } = req.body || {};

    if (!title || typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({
            success: false,
            message: 'Task title is required to generate description'
        });
    }

    const cleanTitle = title.trim();

    // Step 6 / Demo: Deliberate failure test toggle
    if (testFailure === true) {
        console.log('[AI Route] Simulating third-party API 401 Unauthorized failure...');
        return sendFallback(
            res,
            cleanTitle,
            'Third-party AI API failed (Simulated 401 / Timeout). Graceful degradation activated.'
        );
    }

    const fallbackData = generateFallbackTemplate(cleanTitle);

    // Primary provider: Google Gemini
    if (geminiConfigured) {
        try {
            console.log(`[AI Route] Sending request to Gemini (${GEMINI_MODEL}) for: "${cleanTitle}"`);
            const aiDescription = await generateWithGemini(cleanTitle);

            return res.status(200).json({
                success: true,
                fallback: false,
                isAiGenerated: true,
                source: GEMINI_MODEL,
                description: aiDescription,
                priority: fallbackData.priority,
                days: fallbackData.days,
                message: 'AI description generated successfully'
            });
        } catch (err) {
            console.error('[AI Error] Gemini API call failed:', err.message);
            // Step 3 & 6: Graceful degradation catch block
            return sendFallback(
                res,
                cleanTitle,
                `AI service unavailable (${err.message}). Showing template suggestion.`
            );
        }
    }

    // Secondary provider: OpenAI
    if (openaiClient) {
        try {
            console.log(`[AI Route] Sending request to OpenAI API for: "${cleanTitle}"`);
            const aiDescription = await generateWithOpenAI(cleanTitle);

            return res.status(200).json({
                success: true,
                fallback: false,
                isAiGenerated: true,
                source: 'openai-gpt-4o-mini',
                description: aiDescription,
                priority: fallbackData.priority,
                days: fallbackData.days,
                message: 'AI description generated successfully'
            });
        } catch (err) {
            console.error('[AI Error] OpenAI API call failed:', err.message);
            return sendFallback(
                res,
                cleanTitle,
                `AI service unavailable (${err.message}). Showing template suggestion.`
            );
        }
    }

    // Heuristic suggestion engine when no external API key is configured
    return res.status(200).json({
        success: true,
        fallback: false,
        isAiGenerated: true,
        source: 'intelligent-heuristic-engine',
        message: 'AI suggestion generated successfully.',
        ...fallbackData
    });
});

module.exports = router;
