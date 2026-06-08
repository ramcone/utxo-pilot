"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertRoutes = convertRoutes;
const zod_1 = require("zod");
const derivation_js_1 = require("../services/derivation.js");
const ConvertSchema = zod_1.z.object({
    pub: zod_1.z.string().min(10),
    targetType: zod_1.z.enum(['zpub', 'ypub', 'taproot']),
});
async function convertRoutes(app) {
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
                const parsed = (0, derivation_js_1.parsePub)(pub.trim(), 'p2tr');
                const firstAddress = (0, derivation_js_1.deriveAddress)(parsed.xpubNormalized, false, 0, 'p2tr');
                return reply.send({ converted: pub.trim(), firstAddress, isTaproot: true });
            }
            const converted = (0, derivation_js_1.convertPubVersion)(pub.trim(), targetType);
            const parsed = (0, derivation_js_1.parsePub)(converted);
            const scriptType = targetType === 'zpub' ? 'p2wpkh' : 'p2sh-p2wpkh';
            const firstAddress = (0, derivation_js_1.deriveAddress)(parsed.xpubNormalized, false, 0, scriptType);
            return reply.send({ converted, firstAddress, isTaproot: false });
        }
        catch (err) {
            return reply.status(400).send({ error: err.message });
        }
    });
}
//# sourceMappingURL=convert.js.map