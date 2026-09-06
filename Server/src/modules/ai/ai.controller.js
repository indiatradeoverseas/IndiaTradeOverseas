const env = require('../../config/env');
const { ok, fail } = require('../../utils/response');

const NVIDIA_API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

/**
 * AI Chat completion controller using NVIDIA Nemotron NIM API with native fetch
 */
const handleAiChat = async (req, res, next) => {
  try {
    const { messages, userContext } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return fail(res, 400, 'BAD_REQUEST', 'Messages array is required');
    }

    const apiKey = env.CHAT_API_KEY_NVIDIA || process.env.CHAT_API_KEY_NVIDIA;
    if (!apiKey) {
      return fail(res, 500, 'SERVER_ERROR', 'NVIDIA API key is missing on backend configuration.');
    }

    // Build system prompt with employee context
    const userName = userContext?.name || req.user?.fullName || 'Employee';
    const userRole = userContext?.role || req.user?.role || 'Staff Member';
    const userDepartment = userContext?.department || req.user?.department || 'Operations';

    const systemPrompt = {
      role: 'system',
      content: `You are the India Trade Overseas (ITO) AI Work Assistant. 
You are helping ${userName} (Role: ${userRole}, Department: ${userDepartment}).
Company Name: India Trade Overseas (ITO) - Premier Import/Export & CRM Enterprise.

Your Objective:
1. Provide accurate, professional, and instant assistance for employee doubts, task management, email drafting, lead follow-up scripts, attendance rules, and sales queries.
2. Be helpful, concise, polite, and encouraging.
3. You can communicate fluently in English or Hinglish depending on how the employee asks.
4. Format output using markdown bold, bullet points, or numbered lists for high readability.`
    };

    // Sanitize user messages to ensure valid role & content
    const sanitizedMessages = messages
      .filter(m => m && (m.role === 'user' || m.role === 'assistant') && m.content)
      .map(m => ({ role: m.role, content: String(m.content).trim() }));

    const payloadMessages = [systemPrompt, ...sanitizedMessages];

    // Array of fallback models to ensure high availability
    const candidateModels = [
      'nvidia/llama-3.1-nemotron-70b-instruct',
      'meta/llama-3.1-70b-instruct',
      'nvidia/nemotron-4-340b-instruct'
    ];

    let aiResponseText = null;
    let lastError = null;

    for (const model of candidateModels) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000);

        const response = await fetch(NVIDIA_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey.trim()}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: model,
            messages: payloadMessages,
            temperature: 0.5,
            top_p: 0.9,
            max_tokens: 1024
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          if (data && data.choices && data.choices[0] && data.choices[0].message) {
            aiResponseText = data.choices[0].message.content;
            break; // Success!
          }
        } else {
          const errData = await response.json().catch(() => ({}));
          console.warn(`[NVIDIA AI] Model ${model} returned status ${response.status}:`, errData);
          lastError = new Error(`HTTP ${response.status}: ${JSON.stringify(errData)}`);
        }
      } catch (err) {
        console.warn(`[NVIDIA AI] Model ${model} fetch failed:`, err.message);
        lastError = err;
      }
    }

    if (!aiResponseText) {
      console.error('[NVIDIA AI] All candidate models failed:', lastError?.message);
      return fail(
        res,
        502,
        'AI_SERVICE_UNAVAILABLE',
        'NVIDIA AI Assistant service is temporarily busy. Please try again in a few seconds.'
      );
    }

    return ok(res, { reply: aiResponseText }, 'AI response generated successfully', 200, req);
  } catch (error) {
    console.error('Error in AI Chat Controller:', error);
    return next(error);
  }
};

module.exports = {
  handleAiChat
};
