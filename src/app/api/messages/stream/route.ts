import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { messageEvents } from '@/lib/message-events';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const sendUpdate = () => {
        try {
          controller.enqueue(encoder.encode('data: {"type":"update"}\n\n'));
        } catch {
          // controller already closed
        }
      };

      // Kirim sinyal awal agar klien langsung memuat
      sendUpdate();

      const onUpdate = () => sendUpdate();
      messageEvents.on('update', onUpdate);

      // Heartbeat agar koneksi tidak putus oleh proxy/timeout
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'));
        } catch {
          // ignore
        }
      }, 25000);

      const cleanup = () => {
        clearInterval(heartbeat);
        messageEvents.off('update', onUpdate);
        try {
          controller.close();
        } catch {
          // ignore
        }
      };

      request.signal.addEventListener('abort', cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
