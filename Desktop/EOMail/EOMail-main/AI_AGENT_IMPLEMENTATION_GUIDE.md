# AI Agent Optimization Implementation Guide

## Overview

This guide implements a production-ready, cost-optimized AI agent system for EOMail using:
- **Frontend**: React browser-based agent with multi-layer caching
- **Backend**: Express API with streaming LLM responses
- **Database**: Render PostgreSQL (free tier)
- **LLM API**: OpenAI GPT-3.5-Turbo (optimized for cost)

---

## Quick Start

### 1. Database Setup

```bash
# Run migrations
npm run db:push

# Verify tables created
psql $DATABASE_URL -c "\dt"
```

### 2. Environment Variables

```bash
# .env
OPENAI_API_KEY=sk_...
GROQ_API_KEY=gsk_... (optional, for free tier)
DATABASE_URL=postgresql://...
```

### 3. API Endpoints

Create these endpoints in `server/routes.ts`:

```typescript
// Streaming chat endpoint
app.post('/api/agent/chat', authenticateUser, async (req, res) => {
  const { message, conversation_id, stream = true } = req.body;

  if (stream) {
    // Stream response token-by-token
    res.setHeader('Content-Type', 'text/event-stream');
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [...conversationHistory, { role: 'user', content: message }],
      stream: true,
    });

    for await (const chunk of response) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }
  }

  // Save to database
  await db.insert(messages).values({
    conversation_id,
    role: 'user',
    content: message,
  });

  res.end();
});

// Cache lookup
app.get('/api/cache/:hash', async (req, res) => {
  const cached = await db.query.cache.findFirst({
    where: eq(cache.queryHash, req.params.hash),
  });

  if (cached) {
    await db.update(cache)
      .set({ hits: sql`hits + 1` })
      .where(eq(cache.id, cached.id));

    return res.json({ response: cached.response, cached: true });
  }

  res.status(404).json({ cached: false });
});
```

### 4. Frontend Component

```typescript
import { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import crypto from 'crypto-js';

export function AIAgentChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  // Local cache with IndexedDB
  const getFromCache = async (queryHash) => {
    const db = await openDB('eomail-cache');
    return db.get('ai-responses', queryHash);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const queryHash = crypto.SHA256(input).toString();

    // Check local cache first
    const cached = await getFromCache(queryHash);
    if (cached) {
      setMessages([...messages, { role: 'assistant', content: cached }]);
      return;
    }

    // Stream from API
    setIsStreaming(true);
    const response = await fetch('/api/agent/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: input, stream: true }),
    });

    const reader = response.body.getReader();
    let fullResponse = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = new TextDecoder().decode(value);
      const lines = text.split('\n').filter(l => l.startsWith('data:'));

      for (const line of lines) {
        const data = JSON.parse(line.replace('data: ', ''));
        const token = data.choices[0]?.delta?.content || '';
        fullResponse += token;
        setMessages([...messages, { role: 'assistant', content: token, streaming: true }]);
      }
    }

    // Save to cache
    await fetch('/api/cache', {
      method: 'POST',
      body: JSON.stringify({
        queryHash,
        response: fullResponse,
        ttlHours: 24,
      }),
    });

    setIsStreaming(false);
  };

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            {msg.content}
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the AI agent..."
          disabled={isStreaming}
        />
        <button type="submit" disabled={isStreaming}>
          Send
        </button>
      </form>
    </div>
  );
}
```

---

## Optimization Strategies

### 1. Caching (70% cost reduction)

**Three-layer cache architecture:**

```
User Input
    ↓
[1] Memory Cache (React state) ← 5 min
    ↓ (miss)
[2] IndexedDB (Browser storage) ← 30 days
    ↓ (miss)
[3] PostgreSQL (Server cache) ← 90 days
    ↓ (miss)
OpenAI API (ACTUAL COST!)
```

**Implementation:**
```typescript
const queryHash = SHA256(input + model + temperature);

// Check all caches
const response =
  memoryCache.get(queryHash) ||
  await idbCache.get(queryHash) ||
  await fetch(`/api/cache/${queryHash}`).then(r => r.json()) ||
  await callOpenAI();
```

### 2. Request Batching

Combine multiple requests into single API call:

```typescript
const requestQueue = [];
const flushQueue = debounce(async () => {
  const combined = {
    messages: requestQueue.map(r => r.message).join('\n---\n'),
    tasks: requestQueue.length,
  };
  const responses = await openai.chat.completions.create({
    messages: [{ role: 'user', content: JSON.stringify(combined) }],
  });

  requestQueue.forEach((req, i) => {
    req.resolve(responses[i]);
  });
  requestQueue = [];
}, 200);

function queueRequest(message) {
  return new Promise(resolve => {
    requestQueue.push({ message, resolve });
    flushQueue();
  });
}
```

### 3. Token Optimization

```typescript
// Strategy 1: System prompt caching
const systemPrompt = `You are an AI assistant for an email application...`;
const cachedSystemPrompt = await cacheManager.getOrCreate(
  'system-prompt',
  () => Promise.resolve(systemPrompt),
  { ttl: '30d' }
);

// Strategy 2: Context pruning
function pruneContext(messages, maxTokens = 3000) {
  const recentMessages = messages.slice(-10); // Keep last 10
  let tokenCount = countTokens(recentMessages);

  if (tokenCount > maxTokens) {
    // Remove middle messages, keep system + recent
    return [messages[0], ...recentMessages.slice(-5)];
  }
  return recentMessages;
}

// Strategy 3: Smaller models for simple tasks
function selectModel(complexity) {
  if (complexity === 'high') return 'gpt-4';
  if (complexity === 'medium') return 'gpt-3.5-turbo';
  return 'gpt-3.5-turbo'; // Use smaller for simple
}
```

### 4. Streaming Responses

Real-time token streaming for better UX:

```typescript
// Server: Use Server-Sent Events (SSE)
app.post('/api/agent/stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const stream = await openai.chat.completions.create({
    ...chatParams,
    stream: true,
  });

  let tokenCount = 0;
  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content || '';
    if (token) {
      tokenCount++;
      res.write(`data: ${JSON.stringify({ token, count: tokenCount })}\n\n`);
    }
  }

  res.write('data: [DONE]\n\n');
  res.end();
});

// Client: Parse streaming response
async function streamChat(message) {
  const response = await fetch('/api/agent/stream', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        if (data.token) {
          fullText += data.token;
          // Update UI in real-time
          updateChatUI(fullText);
        }
      }
    }
  }

  return fullText;
}
```

---

## Database Schema Details

### ai_conversations Table
```sql
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  title TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_conversations_user_created
  ON ai_conversations(user_id, created_at DESC);
```

### ai_cache Table (Critical for optimization)
```sql
CREATE TABLE ai_cache (
  id UUID PRIMARY KEY,
  query_hash VARCHAR(64) UNIQUE,
  prompt TEXT,
  response TEXT,
  model VARCHAR(50),
  tokens_saved INTEGER,
  hits INTEGER DEFAULT 0,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_cache_hash ON ai_cache(query_hash);
CREATE INDEX idx_cache_expires ON ai_cache(expires_at);

-- Auto-cleanup of expired cache
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM ai_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Run daily via cron job
SELECT cron.schedule('cleanup-ai-cache', '0 0 * * *', 'SELECT cleanup_expired_cache()');
```

---

## Performance Targets

| Metric | Target | Strategy |
|--------|--------|----------|
| Cache Hit Rate | 70%+ | Multi-layer caching |
| API Latency | <500ms | Streaming + connection pooling |
| Cost/Request | <$0.01 | Caching + token optimization |
| Error Rate | <1% | Retry logic + fallbacks |
| DB Query Time | <50ms | Proper indexes |

---

## Monitoring & Alerts

```typescript
// Log analytics for every request
async function logAnalytics(event) {
  await db.insert(analytics).values({
    user_id: userId,
    event_type: event.type,
    model: event.model,
    latency_ms: event.duration,
    tokens: event.tokens,
    success: event.success,
    error_type: event.error,
    metadata: { cache_hit: event.cached },
    created_at: new Date(),
  });

  // Check alerts
  if (event.duration > 3000) {
    console.warn('SLOW REQUEST:', event);
  }
  if (!event.success) {
    console.error('API ERROR:', event);
  }
}
```

---

## Deployment on Render

1. Update `render.yaml`:
```yaml
env:
  - key: OPENAI_API_KEY
    sync: false
  - key: GROQ_API_KEY
    sync: false
```

2. Deploy:
```bash
git push origin main
# Render auto-deploys with new AI endpoints
```

3. Monitor:
```bash
# View logs in Render dashboard
# Check PostgreSQL disk usage: < 500 MB (free tier)
# Monitor API costs: < $50/month
```

---

## Cost Breakdown (Typical Usage)

| Component | Monthly Cost |
|-----------|---|
| Render DB | $0 (free) |
| Render Web Service | $0 (free) |
| OpenAI API | $5-20 (70% reduction via caching) |
| **Total** | **$5-20/month** |

Without caching: $20-50/month
**Savings: 75%**

---

## Next Steps

1. ✅ Review this plan with team
2. ⬜ Create database migration files
3. ⬜ Implement API endpoints
4. ⬜ Build React chat component
5. ⬜ Test caching layers
6. ⬜ Deploy to Render
7. ⬜ Monitor and optimize
