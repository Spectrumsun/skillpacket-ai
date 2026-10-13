import { z } from 'zod';
import { careerNames } from './careers.ts';
import type { CareerName, SkillNode } from './careers.ts';
export const PACKET_LIMIT = 100_000;
const label = z.string().trim().min(1).max(200);
export const LearnerInput = z.object({
  targetCareer: z.enum(careerNames),
  region: label, experience: z.enum(['beginner', 'intermediate']).default('beginner'),
  minutesPerDay: z.number().int().min(5).max(180).default(15),
}).strict();
export const SourceInput = z.object({
  title: label, kind: z.enum(['text', 'transcript']),
  text: z.string().trim().min(40).max(200_000),
  url: z.url().refine(v => ['http:', 'https:'].includes(new URL(v).protocol), 'Use an HTTP(S) URL').optional(),
  language: z.literal('en').default('en'),
}).strict();
export const GenerateInput = z.object({
  roadmapId: z.uuid(), nodeId: label, sourceId: z.uuid(),
}).strict();
export const PacketSchema = z.object({
  id: z.uuid(), version: z.literal(1), roadmapId: z.uuid(), nodeId: label,
  title: label, language: z.literal('en'), estimatedMinutes: z.number().int().min(1).max(15),
  objective: z.string().min(1).max(1000), prerequisites: z.array(label).max(10),
  summary: z.string().min(1).max(20_000), takeaways: z.array(z.string().min(1).max(2000)).min(1).max(8),
  workedExample: z.string().min(1).max(5000), practicalTask: z.string().min(1).max(5000),
  narrationScript: z.string().min(1).max(20_000),
  quiz: z.array(z.object({
    id: label, question: z.string().min(1).max(1000),
    options: z.array(z.string().min(1).max(2000)).min(2).max(5),
    correctIndex: z.number().int().nonnegative(), explanation: z.string().min(1).max(2000),
  }).strict().refine(q => q.correctIndex < q.options.length, 'Answer index must reference an option')).min(1).max(8),
  careerConnection: z.string().min(1).max(2000),
  sources: z.array(z.object({ sourceId: z.uuid(), title: label, url: z.url().optional(), locator: label }).strict()).min(1).max(20),
  generator: z.literal('development-extractive-v1'), reviewStatus: z.literal('unreviewed'),
  createdAt: z.iso.datetime(),
}).strict();
export type Packet = z.infer<typeof PacketSchema>;
export type Learner = z.infer<typeof LearnerInput>;
export type Source = z.infer<typeof SourceInput> & { id: string; createdAt: string };
export type Node = SkillNode;
export type Roadmap = { id: string; learnerId: string; targetCareer: CareerName; nodes: Node[]; status: 'curated-template'; marketEvidence: null; createdAt: string };
export function validatePacket(value: unknown): { packet: Packet; json: string; bytes: number } {
  const packet = PacketSchema.parse(value);
  const json = JSON.stringify(packet);
  const bytes = Buffer.byteLength(json, 'utf8');
  if (bytes >= PACKET_LIMIT) throw new Error(`Packet must be below ${PACKET_LIMIT} bytes; received ${bytes}`);
  return { packet, json, bytes };
}
