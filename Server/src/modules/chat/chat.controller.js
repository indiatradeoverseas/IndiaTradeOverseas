const ChatSession = require('./chatSession.model');
const ChatMessage = require('./chatMessage.model');
const Lead = require('../leads/lead.model');
const LeadActivity = require('../leads/leadActivity.model');
const crypto = require('crypto');
const { encryptText, hashText, maskPhone, maskEmail } = require('../../utils/crypto');
const { ok, fail } = require('../../utils/response');

async function initSession(req, res, next) {
  try {
    const { clientName, clientEmail } = req.body;
    if (!clientName) {
      return fail(res, 400, 'VALIDATION_FAILED', 'clientName is required');
    }

    const sessionId = 'session_' + crypto.randomBytes(8).toString('hex');
    const session = await ChatSession.create({
      sessionId,
      clientName,
      clientEmail: clientEmail || ''
    });

    
    const welcomeText = `Hello ${clientName}! How can I assist you with our catalog today? We specialize in Natural Stones, Industrial Coal, Premium Tea, and Rice Commodities.`;
    const welcomeMsg = await ChatMessage.create({
      sessionId,
      sender: 'AI_AGENT',
      senderName: 'AI Agent',
      message: welcomeText
    });

    
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const leadCode = `LD-${timestamp}-${random}`;
    
    const emailToUse = clientEmail || 'chat@example.com';
    const phoneToUse = '9876543210'; 

    const newLead = await Lead.create({
      leadCode,
      source: 'AI_AGENT',
      customerName: clientName,
      companyName: 'Chat Customer',
      companyNameHash: hashText('chatcustomer'),
      phoneEncrypted: encryptText(phoneToUse),
      phoneMasked: maskPhone(phoneToUse),
      phoneHash: hashText(phoneToUse),
      emailEncrypted: encryptText(emailToUse),
      emailMasked: maskEmail(emailToUse),
      emailHash: hashText(emailToUse),
      productCategory: 'STONE', 
      quantity: 'Not specified',
      destination: 'Not specified',
      priority: 'WARM',
      stage: 'NEW_LEAD',
      assignedTo: null,
      assignedDepartment: 'SALES',
      chatSummary: `AI Agent: ${welcomeText}`
    });

    
    await LeadActivity.create({
      leadId: newLead._id,
      actionType: 'LEAD_CREATED',
      note: 'Lead created via support chat onboarding',
      actorId: null
    });

    
    session.leadId = newLead._id;
    await session.save();

    return ok(res, { session, messages: [welcomeMsg] }, 'Chat session initialized successfully', 201, req);
  } catch (error) {
    next(error);
  }
}

async function getMessages(req, res, next) {
  try {
    const { sessionId } = req.params;
    const session = await ChatSession.findOne({ sessionId });
    if (!session) {
      return fail(res, 404, 'NOT_FOUND', 'Session not found');
    }
    const messages = await ChatMessage.find({ sessionId }).sort({ createdAt: 1 });
    return ok(res, { session, messages }, 'Messages list retrieved', 200, req);
  } catch (error) {
    next(error);
  }
}

async function sendMessage(req, res, next) {
  try {
    const { sessionId } = req.params;
    const { message } = req.body;

    if (!message) {
      return fail(res, 400, 'VALIDATION_FAILED', 'message is required');
    }

    const session = await ChatSession.findOne({ sessionId });
    if (!session) {
      return fail(res, 404, 'NOT_FOUND', 'Session not found');
    }

    
    const clientMsg = await ChatMessage.create({
      sessionId,
      sender: 'CLIENT',
      senderName: session.clientName,
      message
    });

    
    const normalizedText = message.toLowerCase();
    const isWebsiteProductRelated = 
      normalizedText.includes('stone') ||
      normalizedText.includes('coal') ||
      normalizedText.includes('tea') ||
      normalizedText.includes('rice') ||
      normalizedText.includes('price') ||
      normalizedText.includes('catalog') ||
      normalizedText.includes('buy') ||
      normalizedText.includes('import') ||
      normalizedText.includes('export') ||
      normalizedText.includes('aggregates') ||
      normalizedText.includes('pricing') ||
      normalizedText.includes('quote') ||
      normalizedText.includes('order');

    let aiReplyText = '';

    if (isWebsiteProductRelated) {
      if (normalizedText.includes('stone')) {
        aiReplyText = 'We offer premium Natural Stones (Granite, Marble, and Stone Aggregates). Shipped worldwide from major ports with a minimum order quantity (MOQ) of 500 MT.';
      } else if (normalizedText.includes('coal')) {
        aiReplyText = 'We supply high-grade Industrial Coal with optimal thermal properties for manufacturing, cement production, and power generation.';
      } else if (normalizedText.includes('tea')) {
        aiReplyText = 'We export authentic Darjeeling and Assam Orthodox & CTC teas directly sourced from top tea estates.';
      } else if (normalizedText.includes('rice')) {
        aiReplyText = 'We supply premium Basmati and Non-Basmati long-grain rice globally. Fully certified for quality and compliance.';
      } else {
        aiReplyText = 'We deal in Natural Stones, Industrial Coal, Premium Tea, and Rice Commodities. Please specify your product requirements, destination port, and quantity so we can prepare a quotation.';
      }
    } else {
      
      aiReplyText = 'For custom questions or non-catalog inquiries, please visit our Contact Page directly or reach out to our team at info@indiatradeoverseas.com. Redirecting you to the Contact Page now...';
    }

    
    const aiMsg = await ChatMessage.create({
      sessionId,
      sender: 'AI_AGENT',
      senderName: 'AI Agent',
      message: aiReplyText
    });

    
    if (session.leadId) {
      const allMsgs = await ChatMessage.find({ sessionId }).sort({ createdAt: 1 });
      const summaryText = allMsgs.map(m => `${m.senderName}: ${m.message}`).join('\n');
      
      const lead = await Lead.findById(session.leadId);
      if (lead) {
        lead.chatSummary = summaryText;
        
        
        if (normalizedText.includes('stone')) lead.productCategory = 'STONE';
        else if (normalizedText.includes('coal')) lead.productCategory = 'COAL';
        else if (normalizedText.includes('tea')) lead.productCategory = 'TEA';
        else if (normalizedText.includes('rice')) lead.productCategory = 'RICE';

        await lead.save();
      }
    }

    return ok(res, { reply: aiMsg }, 'Message processed successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

async function getAdminSessions(req, res, next) {
  try {
    const sessions = await ChatSession.find().populate('leadId').sort({ updatedAt: -1 });
    return ok(res, { sessions }, 'Admin chat sessions retrieved successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

async function sendAdminReply(req, res, next) {
  try {
    const { sessionId } = req.params;
    const { message } = req.body;

    if (!message) {
      return fail(res, 400, 'VALIDATION_FAILED', 'message is required');
    }

    const session = await ChatSession.findOne({ sessionId });
    if (!session) {
      return fail(res, 404, 'NOT_FOUND', 'Session not found');
    }

    
    const replyMsg = await ChatMessage.create({
      sessionId,
      sender: 'ADMIN',
      senderName: req.user.fullName || 'Admin',
      message
    });

    
    if (session.leadId) {
      const allMsgs = await ChatMessage.find({ sessionId }).sort({ createdAt: 1 });
      const summaryText = allMsgs.map(m => `${m.senderName}: ${m.message}`).join('\n');
      
      const lead = await Lead.findById(session.leadId);
      if (lead) {
        lead.chatSummary = summaryText;
        await lead.save();
      }
    }

    return ok(res, { reply: replyMsg }, 'Admin reply sent successfully', 201, req);
  } catch (error) {
    next(error);
  }
}

async function resolveSession(req, res, next) {
  try {
    const { sessionId } = req.params;
    const session = await ChatSession.findOne({ sessionId });
    if (!session) {
      return fail(res, 404, 'NOT_FOUND', 'Session not found');
    }

    session.status = 'RESOLVED';
    await session.save();

    
    await ChatMessage.create({
      sessionId,
      sender: 'SYSTEM',
      senderName: 'System',
      message: `Session marked resolved by ${req.user.fullName || 'Admin'}`
    });

    return ok(res, { session }, 'Session resolved successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  initSession,
  getMessages,
  sendMessage,
  getAdminSessions,
  sendAdminReply,
  resolveSession
};
