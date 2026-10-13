import { z } from 'zod';
import { parsePacket, RoadmapSchema } from './model.ts';
import type { Profile } from './model.ts';
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
async function request(path: string, body?: unknown) {
  const response = await fetch(`/api${path}`, {
    method: body === undefined ? 'GET' : 'POST', signal: AbortSignal.timeout(12_000),
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, json?.error?.message ?? 'The learning service is unavailable. Please try again when connected.');
  return json;
}
const JobSchema = z.object({ id: z.uuid(), status: z.enum(['queued', 'running', 'succeeded', 'failed']), packetId: z.uuid().nullable(), error: z.string().nullable() });
export const api = {
  async health() { const health = await request('/health'); if (health?.status !== 'ok') throw new Error('Learning service is unavailable.'); },
  async roadmap(profile: Profile) {
    const learner = z.object({ id: z.uuid() }).parse(await request('/v1/learners', profile));
    return RoadmapSchema.parse(await request(`/v1/learners/${learner.id}/roadmaps`, {}));
  },
  async source(input: { title: string; kind: 'text' | 'transcript'; text: string; url?: string }) {
    return z.object({ id: z.uuid() }).parse(await request('/v1/sources', input));
  },
  async generate(roadmapId: string, nodeId: string, sourceId: string) { return JobSchema.parse(await request('/v1/packet-jobs', { roadmapId, nodeId, sourceId })); },
  async job(id: string) { return JobSchema.parse(await request(`/v1/jobs/${id}`)); },
  async packet(id: string) { return parsePacket(await request(`/v1/packets/${id}/download`)); },
};
