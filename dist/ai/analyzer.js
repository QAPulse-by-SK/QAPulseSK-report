"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeFailures = analyzeFailures;
const SYSTEM_PROMPT = `You are an expert QA engineer. Analyze test failures and provide:
1. A brief plain-English summary (1-2 sentences)
2. The likely root cause
3. A concrete fix suggestion

Be specific, concise, and actionable. Respond in JSON only.`;
function buildPrompt(test) {
    return `Test: "${test.fullTitle}"
Error: ${test.error?.message || 'Unknown error'}
Stack: ${test.error?.stack?.split('\n').slice(0, 5).join('\n') || 'N/A'}
Expected: ${test.error?.expected || 'N/A'}
Actual: ${test.error?.actual || 'N/A'}

Respond with JSON: { "summary": "...", "rootCause": "...", "suggestion": "...", "confidence": "high|medium|low" }`;
}
async function callAnthropic(prompt, apiKey, model) {
    try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model,
                max_tokens: 512,
                system: SYSTEM_PROMPT,
                messages: [{ role: 'user', content: prompt }],
            }),
        });
        if (!res.ok)
            return null;
        const data = await res.json();
        const text = data.content.find(c => c.type === 'text')?.text || '';
        return JSON.parse(text.replace(/```json|```/g, '').trim());
    }
    catch {
        return null;
    }
}
async function callOpenAI(prompt, apiKey, model) {
    try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                max_tokens: 512,
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: prompt },
                ],
            }),
        });
        if (!res.ok)
            return null;
        const data = await res.json();
        const text = data.choices[0]?.message?.content || '';
        return JSON.parse(text.replace(/```json|```/g, '').trim());
    }
    catch {
        return null;
    }
}
async function callGemini(prompt, apiKey, model) {
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\n${prompt}` }] }],
                generationConfig: { maxOutputTokens: 512 },
            }),
        });
        if (!res.ok)
            return null;
        const data = await res.json();
        const text = data.candidates[0]?.content?.parts[0]?.text || '';
        return JSON.parse(text.replace(/```json|```/g, '').trim());
    }
    catch {
        return null;
    }
}
const DEFAULT_MODELS = {
    anthropic: 'claude-3-5-haiku-20241022',
    openai: 'gpt-4o-mini',
    gemini: 'gemini-1.5-flash',
};
async function analyzeFailures(failedTests, config) {
    const results = new Map();
    if (!config.enabled || !config.apiKey)
        return results;
    const provider = config.provider || 'anthropic';
    const model = config.model || DEFAULT_MODELS[provider];
    const limit = config.maxFailuresToAnalyze || 10;
    const testsToAnalyze = failedTests.slice(0, limit);
    console.log(`\n🤖 QAPulseSK-report: AI analysis enabled (${provider}) — analyzing ${testsToAnalyze.length} failure(s)...\n`);
    for (const test of testsToAnalyze) {
        const prompt = buildPrompt(test);
        let analysis = null;
        if (provider === 'anthropic') {
            analysis = await callAnthropic(prompt, config.apiKey, model);
        }
        else if (provider === 'openai') {
            analysis = await callOpenAI(prompt, config.apiKey, model);
        }
        else if (provider === 'gemini') {
            analysis = await callGemini(prompt, config.apiKey, model);
        }
        if (analysis) {
            results.set(test.id, { ...analysis, testId: test.id });
        }
    }
    return results;
}
//# sourceMappingURL=analyzer.js.map