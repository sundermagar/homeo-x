import type { Request, Response } from 'express';

export function initSSE(res: Response): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // nginx: disable proxy buffering
  res.flushHeaders();
}

export function sendSSEChunk(res: Response, data: object): void {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export function sendSSEDone(res: Response): void {
  res.write('data: [DONE]\n\n');
  res.end();
}

export async function streamToSSE(
  req: Request,
  res: Response,
  generator: AsyncGenerator<{ chunk: string; provider: string }>,
  sessionId: string,
): Promise<void> {
  initSSE(res);
  let disconnected = false;
  
  req.on('close', () => {
    disconnected = true;
  });

  try {
    for await (const item of generator) {
      if (disconnected) break;
      sendSSEChunk(res, { 
        chunk: item.chunk, 
        provider: item.provider, 
        sessionId 
      });
    }
  } catch (error) {
    console.error('[SSE Stream Error]:', error);
    if (!disconnected) {
      sendSSEChunk(res, { error: 'Stream interrupted due to an internal error' });
    }
  } finally {
    if (!disconnected) {
      sendSSEDone(res);
    }
  }
}
