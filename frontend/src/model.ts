import { z } from 'zod';
import { careerNames } from '../../backend/src/careers.ts';
import type { CareerName } from '../../backend/src/careers.ts';
import { PacketSchema as BackendPacketSchema } from '../../backend/src/schema.ts';
export const PacketSchema = BackendPacketSchema.extend({ generator: z.enum(['development-extractive-v1', 'starter-lesson-v1']) });
export type Packet = z.infer<typeof PacketSchema>;
export const RoadmapSchema = z.object({ id: z.uuid(), learnerId: z.uuid(), targetCareer: z.enum(careerNames).default('Flutter Mobile Developer'), nodes: z.array(z.object({ id: z.string(), title: z.string(), objective: z.string(), prerequisites: z.array(z.string()), careerTask: z.string() })), status: z.literal('curated-template'), marketEvidence: z.null(), createdAt: z.string() });
export type Roadmap = z.infer<typeof RoadmapSchema>;
export type Profile = { targetCareer: CareerName; region: string; experience: 'beginner' | 'intermediate'; minutesPerDay: number };
export type Session = { profile: Profile; roadmap: Roadmap; mode: 'starter' | 'connected' };
export type Progress = { packetId: string; answers: Record<string, number>; checked: boolean; completedAt?: string };
export type PendingJob = { id: string; roadmapId: string; nodeId: string };
export function parsePacket(value: unknown): Packet {
  const packet = PacketSchema.parse(value);
  if (new TextEncoder().encode(JSON.stringify(packet)).byteLength >= 100_000) throw new Error('This packet exceeds the 100KB limit.');
  return packet;
}
export const packetBytes = (packet: Packet) => new TextEncoder().encode(JSON.stringify(packet)).byteLength;
export const formatBytes = (bytes: number) => `${(bytes / 1000).toFixed(1)} KB`;
export function quizScore(packet: Packet, answers: Record<string, number>) {
  return packet.quiz.reduce((sum, question) => sum + Number(answers[question.id] === question.correctIndex), 0);
}
export function canCheckQuiz(packet: Packet, answers: Record<string, number>) {
  return packet.quiz.every(question => Number.isInteger(answers[question.id]) && answers[question.id] >= 0 && answers[question.id] < question.options.length);
}
export function safeSourceUrl(url?: string): string | undefined {
  try { if (url && ['https:', 'http:'].includes(new URL(url).protocol)) return url; } catch { /* Text-only attribution is still available. */ }
}
