const env = require('../../config/env');
const { ok, fail } = require('../../utils/response');
const socketService = require('../../services/socket.service');

const NVIDIA_API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

/**
 * Call NVIDIA NIM API with fallback model candidates
 */
async function callNvidiaNimApi(payloadMessages, temperature = 0.2) {
  const rawKey = env.CHAT_API_KEY_NVIDIA || process.env.CHAT_API_KEY_NVIDIA || process.env.NVIDIA_API_KEY || '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';
  const apiKey = String(rawKey).trim();

  const candidateModels = [
    'meta/llama3-70b-instruct',
    'nvidia/llama-3.1-nemotron-70b-instruct',
    'meta/llama-3.2-11b-vision-instruct',
    'google/gemma-3-12b-it',
    'ibm/granite-3.0-8b-instruct'
  ];

  let lastError = null;

  for (const model of candidateModels) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const response = await fetch(NVIDIA_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages: payloadMessages,
          temperature,
          top_p: 0.9,
          max_tokens: 1024
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data && data.choices && data.choices[0] && data.choices[0].message) {
          return data.choices[0].message.content;
        }
      } else {
        const errData = await response.json().catch(() => ({}));
        lastError = new Error(`NVIDIA HTTP ${response.status}: ${JSON.stringify(errData)}`);
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('NVIDIA AI models unreachable');
}

/**
 * RBAC Permission Checker for AI Voice & Text Commands (DPR Part 13)
 */
const checkRbacPermission = (role, dept, action, target) => {
  const normRole = (role || '').toUpperCase();
  const normDept = (dept || '').toUpperCase();
  const normTarget = (target || '').toUpperCase();

  // Founder, Admin, Director, CEO have unrestricted access
  if (['ADMIN', 'FOUNDER', 'CEO', 'DIRECTOR', 'SUPER_ADMIN'].includes(normRole)) {
    return { allowed: true };
  }

  // HR Target Protection
  if (normTarget === 'HR' || normTarget === 'LEAVE_APPROVALS') {
    const isHR = normRole.includes('HR') || normDept.includes('HR');
    if (!isHR) {
      return {
        allowed: false,
        reason: `Your role (${role || 'Executive'}) does not have authorization to access HR Dashboard or Leave Approvals.`
      };
    }
  }

  // Transport Target Protection
  if (normTarget === 'TRANSPORT') {
    const isTransport = normRole.includes('TRANSPORT') || normRole.includes('DRIVER') || normDept.includes('TRANSPORT');
    if (!isTransport) {
      return {
        allowed: false,
        reason: `Your role (${role || 'Executive'}) does not have authorization to access Transport Operations.`
      };
    }
  }

  return { allowed: true };
};

/**
 * AI Chat completion controller using NVIDIA Nemotron NIM API
 */
const handleAiChat = async (req, res, next) => {
  try {
    const { messages, userContext } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return fail(res, 400, 'BAD_REQUEST', 'Messages array is required');
    }

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

    const sanitizedMessages = messages
      .filter(m => m && (m.role === 'user' || m.role === 'assistant') && m.content)
      .map(m => ({ role: m.role, content: String(m.content).trim() }));

    const payloadMessages = [systemPrompt, ...sanitizedMessages];

    const aiResponseText = await callNvidiaNimApi(payloadMessages, 0.5);

    return ok(res, { reply: aiResponseText }, 'AI response generated successfully', 200, req);
  } catch (error) {
    console.error('Error in AI Chat Controller:', error);
    return next(error);
  }
};

/**
 * Handle AI Voice / Text Command Intent (NVIDIA API + RBAC + Guardrails)
 */
const handleAiCommand = async (req, res, next) => {
  try {
    const { userCommand } = req.body;
    if (!userCommand || typeof userCommand !== 'string' || !userCommand.trim()) {
      return fail(res, 400, 'BAD_REQUEST', 'User command text is required');
    }

    const userName = req.user?.fullName || req.user?.name || 'User';
    const userRole = (req.user?.role || 'EXECUTIVE').toUpperCase();
    const userDept = (req.user?.department || 'GENERAL').toUpperCase();

    const systemPrompt = {
      role: 'system',
      content: `You are the India Trade Overseas (ITO) CRM Voice & Text AI Command Assistant.
Your job is to convert user voice or text commands into JSON action intents.

User Context:
- Name: "${userName}"
- Role: "${userRole}"
- Department: "${userDept}"

Supported Action Intent Types:
- OPEN_DASHBOARD (targets: HR, TRANSPORT, SALES, FOUNDER)
- NAVIGATE (targets: LEADS, FOLLOWUPS, TICKETS, QUOTATIONS, PROFILE, DISPATCHES, DRIVER_MOBILE, ATTENDANCE, LEAVE_APPROVALS)
- SCROLL_DOWN
- SCROLL_UP
- APPROVE_LEAVE (Guardrail required)
- LOGOUT
- UNKNOWN

Rules:
1. Return ONLY valid JSON format. No backticks, no explanatory markdown text.
2. JSON Schema:
{
  "action": "OPEN_DASHBOARD" | "NAVIGATE" | "SCROLL_DOWN" | "SCROLL_UP" | "APPROVE_LEAVE" | "LOGOUT" | "UNKNOWN",
  "target": "HR" | "TRANSPORT" | "SALES" | "FOUNDER" | "LEADS" | "FOLLOWUPS" | "TICKETS" | "PROFILE" | "NONE",
  "targetRoute": "/crm/...",
  "explanation": "Short summary of detected command intent",
  "spokenResponse": "Concise natural voice response to speak back to the user"
}`
    };

    const userMsg = {
      role: 'user',
      content: `User Command: "${userCommand.trim()}"`
    };

    let rawAiContent = '';
    try {
      rawAiContent = await callNvidiaNimApi([systemPrompt, userMsg], 0.1);
    } catch (e) {
      console.warn('[NVIDIA AI Command] Fallback rule evaluation triggered:', e.message);
    }

    // Attempt parsing JSON
    let parsedIntent = null;
    try {
      const match = rawAiContent.match(/\{[\s\S]*\}/);
      if (match) {
        parsedIntent = JSON.parse(match[0]);
      }
    } catch (err) {}

    // Rule-based Intent Engine Fallback (Supports English, Hindi, Hinglish)
    if (!parsedIntent || !parsedIntent.action || parsedIntent.action === 'UNKNOWN') {
      const cmdLower = userCommand.toLowerCase().trim();
      
      const isScrollDown = ['scroll down', 'down scroll', 'niche scroll', 'neeche scroll', 'niche', 'neeche', 'scroll niche', 'scroll down karo', 'niche karo', 'down'].some(k => cmdLower.includes(k));
      const isScrollUp = ['scroll up', 'up scroll', 'uper scroll', 'upar scroll', 'uper', 'upar', 'top', 'up', 'scroll up karo', 'uper karo'].some(k => cmdLower.includes(k));

      if (isScrollDown) {
        parsedIntent = { action: 'SCROLL_DOWN', target: 'NONE', spokenResponse: 'Scrolling down.' };
      } else if (isScrollUp) {
        parsedIntent = { action: 'SCROLL_UP', target: 'NONE', spokenResponse: 'Scrolling up.' };
      } else if (cmdLower.includes('hr') || cmdLower.includes('employee')) {
        parsedIntent = { action: 'OPEN_DASHBOARD', target: 'HR', targetRoute: '/crm/hr', spokenResponse: 'Opening HR Dashboard for you.' };
      } else if (cmdLower.includes('transport') || cmdLower.includes('driver') || cmdLower.includes('gari') || cmdLower.includes('truck')) {
        parsedIntent = { action: 'OPEN_DASHBOARD', target: 'TRANSPORT', targetRoute: '/crm/transport', spokenResponse: 'Opening Transport Control Center.' };
      } else if (cmdLower.includes('sales') || cmdLower.includes('lead') || cmdLower.includes('client')) {
        parsedIntent = { action: 'OPEN_DASHBOARD', target: 'SALES', targetRoute: '/crm/sales', spokenResponse: 'Opening Sales Lead Dashboard.' };
      } else if (cmdLower.includes('founder') || cmdLower.includes('admin') || cmdLower.includes('boss')) {
        parsedIntent = { action: 'OPEN_DASHBOARD', target: 'FOUNDER', targetRoute: '/crm/dashboard', spokenResponse: 'Opening Founder Overview.' };
      } else if (cmdLower.includes('approve') || cmdLower.includes('chutti') || cmdLower.includes('leave')) {
        parsedIntent = { action: 'APPROVE_LEAVE', target: 'HR', targetRoute: '/crm/hr/leave-approvals', spokenResponse: 'Navigating to Leave Approvals.' };
      } else if (cmdLower.includes('logout') || cmdLower.includes('signout') || cmdLower.includes('exit')) {
        parsedIntent = { action: 'LOGOUT', target: 'NONE', spokenResponse: 'Logging you out.' };
      } else if (!parsedIntent) {
        parsedIntent = { action: 'UNKNOWN', target: 'NONE', spokenResponse: 'Command received. I can scroll pages, open dashboards, or navigate routes for you.' };
      }
    }

    // RBAC PERMISSION CHECK (DPR Part 13)
    const isAuthorized = checkRbacPermission(userRole, userDept, parsedIntent.action, parsedIntent.target);

    if (!isAuthorized.allowed) {
      const deniedResponse = {
        success: true,
        allowed: false,
        action: 'PERMISSION_DENIED',
        target: parsedIntent.target,
        message: isAuthorized.reason,
        spokenResponse: `Security Alert: ${isAuthorized.reason}`
      };

      if (req.user?._id) {
        socketService.emitToEmployee(req.user._id, 'ai_command_action', deniedResponse);
      }
      return ok(res, deniedResponse, 'Permission Denied for AI command intent', 200, req);
    }

    // HUMAN-IN-THE-LOOP GUARDRAIL (DPR Part 16.2 / P4)
    if (parsedIntent.action === 'APPROVE_LEAVE') {
      parsedIntent.requiresHumanConfirmation = true;
      parsedIntent.action = 'NAVIGATE_WITH_NOTICE';
      parsedIntent.targetRoute = '/crm/hr/leave-approvals';
      parsedIntent.spokenResponse = `Sir, under DPR safety guardrails, AI cannot auto-approve leaves. I have opened the Leave Approvals desk for you. Please review and click Approve manually.`;
    }

    const payload = {
      success: true,
      allowed: true,
      ...parsedIntent
    };

    if (req.user?._id) {
      socketService.emitToEmployee(req.user._id, 'ai_command_action', payload);
    }

    return ok(res, payload, 'AI command intent processed and authorized', 200, req);
  } catch (error) {
    console.error('Error in handleAiCommand:', error);
    return next(error);
  }
};

/**
 * Role-Based Dynamic Welcome Greeting
 */
const handleAiGreeting = async (req, res, next) => {
  try {
    const userName = req.user?.fullName || req.user?.name || 'Executive';
    const userRole = (req.user?.role || 'EXECUTIVE').toUpperCase();

    let greetingText = '';

    if (['FOUNDER', 'ADMIN', 'CEO', 'DIRECTOR'].includes(userRole)) {
      greetingText = `Welcome Founder ${userName}! Today's revenue overview, pending approvals, and active dispatches are ready. How can I assist you?`;
    } else if (userRole.includes('HR')) {
      greetingText = `Welcome HR Manager ${userName}! You have team leave applications and employee tickets awaiting review. Would you like me to open the Leave desk?`;
    } else if (userRole.includes('TRANSPORT') || userRole.includes('DRIVER')) {
      greetingText = `Welcome Transport Head ${userName}! Active fleet trips and POD verification logs are updated. Ready for dispatch tracking!`;
    } else {
      greetingText = `Welcome Sales Executive ${userName}! Today's active target leads and follow-ups are ready. Let's achieve today's CRM targets!`;
    }

    return ok(res, { greeting: greetingText, role: userRole }, 'Dynamic greeting generated', 200, req);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  handleAiChat,
  handleAiCommand,
  handleAiGreeting
};
