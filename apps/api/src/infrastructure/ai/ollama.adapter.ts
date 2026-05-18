// ─── Ollama Adapter ────────────────────────────────────────────────────────────
// Implements AiProviderPort for local Ollama instances with zero-timeout HTTP handling.

import { createLogger } from '../../shared/logger.js';
import type { AiProviderPort, AiCompletionRequest, AiCompletionResponse } from '../../domains/consultation/ports/ai-provider.port.js';
import http from 'node:http';
import { URL } from 'node:url';

const logger = createLogger('ollama-adapter');

export class OllamaAdapter implements AiProviderPort {
  private readonly baseUrl: string;
  private cachedAvailable: boolean | null = null;
  private cachedAvailableAt = 0;

  constructor(
    public readonly model: string = 'qwen2.5:1.5b',
    baseUrl?: string
  ) {
    this.baseUrl = baseUrl || process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
    logger.info(`Ollama adapter initialized for model: ${model} at ${this.baseUrl}`);
  }

  get name() {
    return 'ollama';
  }

  async isAvailable(): Promise<boolean> {
    // Cache positive result for 5 minutes to avoid re-checking
    // during the 7-phase pipeline (each phase calls isAvailable).
    if (this.cachedAvailable === true && (Date.now() - this.cachedAvailableAt) < 300_000) {
      return true;
    }
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000); // 3s max for availability check
      const response = await fetch(`${this.baseUrl}/api/tags`, { signal: controller.signal });
      clearTimeout(timer);
      if (!response.ok) return false;
      const data = await response.json() as any;
      const found = Array.isArray(data?.models) && data.models.some((m: any) => m.name.includes(this.model) || this.model.includes(m.name));
      if (found) {
        this.cachedAvailable = true;
        this.cachedAvailableAt = Date.now();
      }
      return found;
    } catch {
      this.cachedAvailable = null;
      return false;
    }
  }

  /**
   * Highly robust, timeout-free HTTP client specifically designed to bypass
   * Undici's default 30-second HeadersTimeoutError when running slow CPU models.
   */
  private makeRequest(urlStr: string, body: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(urlStr);
      const postData = JSON.stringify(body);
      
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 80,
        path: parsedUrl.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 0 // Wait infinitely for CPU token generation
      };

      const req = http.request(options, (res) => {
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(rawData));
            } catch (e) {
              reject(new Error(`Failed to parse Ollama JSON response: ${rawData.slice(0, 100)}...`));
            }
          } else {
            reject(new Error(`Ollama API error ${res.statusCode}: ${rawData.slice(0, 200)}`));
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Ollama request socket timeout'));
      });

      req.on('error', (e) => { reject(e); });
      req.write(postData);
      req.end();
    });
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    const start = Date.now();

    const body: any = {
      model: this.model,
      messages: [
        { role: 'system', content: request.systemPrompt },
        { role: 'user', content: request.userPrompt },
      ],
      stream: false,
      keep_alive: '30m', // Keep model loaded in memory across the 7-phase pipeline (avoids 10-30s reload per phase)
      options: {
        temperature: request.temperature ?? 0.3,
        num_predict: Math.max(request.maxTokens ?? 256, 256),
        num_ctx: 2048,
        repeat_penalty: 1.1,
        top_p: 0.8,
      }
    };

    if (request.responseFormat === 'json') {
      body.format = 'json';
    }

    try {
      // Call custom, timeout-free request handler
      const data = await this.makeRequest(`${this.baseUrl}/api/chat`, body);

      let content = data.message?.content || '';

      if (request.responseFormat === 'json') {
        content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        const firstBrace = content.indexOf('{');
        const firstBracket = content.indexOf('[');
        
        let startChar = '{';
        let endChar = '}';
        
        // If '[' appears first, parse as JSON Array instead of Object
        if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
          startChar = '[';
          endChar = ']';
        }
        
        const startIndex = content.indexOf(startChar);
        const endIndex = content.lastIndexOf(endChar);
        
        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
          content = content.substring(startIndex, endIndex + 1);
        }
      }

      const latencyMs = Date.now() - start;

      logger.info({
        provider: 'ollama',
        model: this.model,
        latencyMs,
        inputTokens: data.prompt_eval_count,
        outputTokens: data.eval_count,
      }, 'Ollama completion successful');

      return {
        content,
        provider: 'ollama',
        model: this.model,
        inputTokens: data.prompt_eval_count,
        outputTokens: data.eval_count,
        latencyMs,
      };
    } catch (error: any) {
      logger.error(`Ollama failed: ${error.message}`);
      throw error;
    }
  }
}
