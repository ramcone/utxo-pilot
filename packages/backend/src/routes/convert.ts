import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { convertPubVersion, parsePub, deriveAddress } from '../services/derivation.js';

const ConvertSchema = z.object({
  pub:        z.string().min(10),
  targetType: z.enum(['zpub', 'ypub', 'taproot']),
});

export async function convertRoutes(app: FastifyInstance) {
  app.post('/api/convert-pub', async (req, reply) => {
    const body = ConvertSchema.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Validation failed', issues: body.error.issues });
    }

    try {
      const { pub, targetType } = body.data;

      if (targetType === 'taproot') {
        // For taproot we don't change version bytes — we use the xpub as-is
        // and force the script type to p2tr during import
        const parsed = parsePub(pub.trim(), 'p2tr');
        const firstAddress = deriveAddress(parsed.xpubNormalized, false, 0, 'p2tr');
        return reply.send({ converted: pub.trim(), firstAddress, isTaproot: true });
      }

      const converted = convertPubVersion(pub.trim(), targetType);
      const parsed = parsePub(converted);
      const scriptType = targetType === 'zpub' ? 'p2wpkh' : 'p2sh-p2wpkh';
      const firstAddress = deriveAddress(parsed.xpubNormalized, false, 0, scriptType);

      return reply.send({ converted, firstAddress, isTaproot: false });
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });
}
