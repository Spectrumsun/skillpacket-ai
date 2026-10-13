import { z } from 'zod';
import { careerNames } from './careers.ts';
import { LearnerInput, SourceInput, GenerateInput, PacketSchema } from './schema.ts';
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const jsonResponse = (description: string, schema: unknown = { type: 'object' }) => ({ description, content: { 'application/json': { schema } } });
const body = (name: string) => ({ required: true, content: { 'application/json': { schema: ref(name) } } });
const id = (name = 'id') => ({ name, in: 'path', required: true, schema: { type: 'string', format: 'uuid' } });
const errors = Object.fromEntries([400, 401, 404, 413, 415, 422, 500].map(status => [status, jsonResponse('Request failed', ref('Error'))]));
const responses = (status: number, description: string, schema?: unknown) => ({ ...errors, [status]: jsonResponse(description, schema) });
const node = z.object({ id: z.string(), title: z.string(), objective: z.string(), prerequisites: z.array(z.string()), careerTask: z.string() });
const roadmap = z.object({ id: z.uuid(), learnerId: z.uuid(), targetCareer: z.enum(careerNames), nodes: z.array(node), status: z.literal('curated-template'), marketEvidence: z.null(), createdAt: z.iso.datetime() });
const job = z.object({ id: z.uuid(), status: z.enum(['queued', 'running', 'succeeded', 'failed']), input: GenerateInput, packetId: z.uuid().nullable(), error: z.string().nullable(), createdAt: z.iso.datetime(), updatedAt: z.iso.datetime() });
export function openApi(authenticated: boolean) {
  return {
    openapi: '3.1.0', info: { title: 'SkillPacket AI backend', version: '0.1.0', description: 'Local MVP foundation. Packets use a development extractor, not live AI. Four curated career templates are supported.' },
    security: authenticated ? [{ bearerAuth: [] }] : [],
    paths: {
      '/health': { get: { security: [], responses: { 200: jsonResponse('Service health') } } },
      '/openapi.json': { get: { responses: responses(200, 'This API contract') } },
      '/v1/careers': { get: { responses: responses(200, 'Supported career pathways', { type: 'object', properties: { items: { type: 'array', items: { type: 'object', properties: { title: { type: 'string', enum: [...careerNames] }, description: { type: 'string' }, icon: { type: 'string' }, guidance: { type: 'string' }, milestoneCount: { type: 'integer' } }, required: ['title', 'description', 'icon', 'milestoneCount'] } } }, required: ['items'] }) } },
      '/v1/learners': { post: { requestBody: body('LearnerInput'), responses: responses(201, 'Learner created', ref('Learner')) } },
      '/v1/learners/{id}/roadmaps': {
        post: { parameters: [id()], responses: responses(201, 'Curated roadmap created', ref('Roadmap')) },
        get: { parameters: [id()], responses: responses(200, 'Learner roadmaps', { type: 'object', properties: { items: { type: 'array', items: ref('Roadmap') } }, required: ['items'] }) },
      },
      '/v1/roadmaps/{id}': { get: { parameters: [id()], responses: responses(200, 'Roadmap', ref('Roadmap')) } },
      '/v1/sources': { post: { requestBody: body('SourceInput'), responses: responses(201, 'Source metadata; source text is not returned', ref('SourceMetadata')) } },
      '/v1/packet-jobs': { post: { requestBody: body('GenerateInput'), responses: { ...responses(202, 'Generation queued', ref('Job')), 202: { ...jsonResponse('Generation queued', ref('Job')), headers: { Location: { description: 'Job polling URL', schema: { type: 'string' } } } } } } },
      '/v1/jobs/{id}': { get: { parameters: [id()], responses: responses(200, 'Generation status', ref('Job')) } },
      '/v1/roadmaps/{id}/packets': { get: { parameters: [id()], responses: responses(200, 'Packet metadata', { type: 'object', properties: { items: { type: 'array', items: ref('PacketMetadata') } }, required: ['items'] }) } },
      '/v1/packets/{id}': { get: { parameters: [id()], responses: responses(200, 'Packet JSON, under 100000 UTF-8 bytes', ref('Packet')) } },
      '/v1/packets/{id}/download': { get: { parameters: [id()], responses: { ...responses(200, 'JSON attachment, under 100000 UTF-8 bytes', ref('Packet')), 200: { ...jsonResponse('Packet JSON attachment', ref('Packet')), headers: { 'X-Packet-Bytes': { schema: { type: 'integer', maximum: 99999 } }, 'Content-Disposition': { schema: { type: 'string' } } } } } } },
    },
    components: {
      securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer' } },
      schemas: {
        LearnerInput: z.toJSONSchema(LearnerInput), SourceInput: z.toJSONSchema(SourceInput), GenerateInput: z.toJSONSchema(GenerateInput), Packet: z.toJSONSchema(PacketSchema),
        Learner: z.toJSONSchema(LearnerInput.extend({ id: z.uuid(), createdAt: z.iso.datetime() })),
        Roadmap: z.toJSONSchema(roadmap), Job: z.toJSONSchema(job),
        SourceMetadata: z.toJSONSchema(SourceInput.omit({ text: true }).extend({ id: z.uuid(), createdAt: z.iso.datetime(), textBytes: z.number().int() })),
        PacketMetadata: z.toJSONSchema(PacketSchema.pick({ id: true, nodeId: true, title: true, version: true, reviewStatus: true }).extend({ bytes: z.number().int().max(99999) })),
        Error: { type: 'object', properties: { error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' }, requestId: { type: 'string' }, issues: { type: 'array', items: { type: 'object' } } }, required: ['code', 'message', 'requestId'] } }, required: ['error'] },
      },
    },
  };
}
