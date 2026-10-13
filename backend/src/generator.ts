import { randomUUID } from 'node:crypto';
import { careers } from './careers.ts';
import { validatePacket } from './schema.ts';
import type { Learner, Node, Packet, Roadmap, Source } from './schema.ts';
import type { Store } from './store.ts';
export function createRoadmap(learnerId: string, learner: Learner): Roadmap {
  const nodes = careers[learner.targetCareer].nodes.map(node => ({ ...node, prerequisites: [...node.prerequisites] }));
  return { id: randomUUID(), learnerId, targetCareer: learner.targetCareer, nodes, status: 'curated-template', marketEvidence: null, createdAt: new Date().toISOString() };
}
// Replace this adapter with a grounded LLM implementation. This demo only extracts text;
// it does not claim to summarize, verify source relevance, or personalize teaching.
export interface PacketGenerator { generate(source: Source, roadmap: Roadmap, node: Node): Promise<Packet>; }
export class DevelopmentGenerator implements PacketGenerator {
  async generate(source: Source, roadmap: Roadmap, node: Node): Promise<Packet> {
    const excerpt = source.text.slice(0, 1400);
    const takeaway = source.text.split(/(?<=[.!?])\s+|\n+/u).filter(s => s.trim().length > 20).slice(0, 3).map(s => s.slice(0, 500));
    const packet = {
      id: randomUUID(), version: 1, roadmapId: roadmap.id, nodeId: node.id, title: node.title,
      language: 'en', estimatedMinutes: 5, objective: node.objective, prerequisites: node.prerequisites,
      summary: `Development preview — source excerpt, not an AI summary:\n${excerpt}`,
      takeaways: takeaway.length ? takeaway : [excerpt.slice(0, 500)],
      workedExample: 'Worked examples require a teaching generator or instructor review. This preview includes source text only.',
      practicalTask: `Using this source, draft an approach to the following objective: ${node.objective} Identify any information the source does not provide.`,
      narrationScript: `This is an unreviewed development preview. ${node.title}. ${excerpt}`,
      quiz: [{ id: 'source-check', question: 'Which statement accurately describes this packet?', options: ['It contains an unreviewed excerpt from the attached source.', 'It certifies mastery of this skill.', 'It establishes current hiring demand.'], correctIndex: 0, explanation: 'This development generator extracts source text. A reviewed teaching generator is needed for subject-specific assessment.' }],
      careerConnection: node.careerTask,
      sources: [{ sourceId: source.id, title: source.title, ...(source.url ? { url: source.url } : {}), locator: `Characters 1–${excerpt.length} of submitted text` }],
      generator: 'development-extractive-v1', reviewStatus: 'unreviewed', createdAt: new Date().toISOString(),
    };
    return validatePacket(packet).packet;
  }
}
export async function processNext(store: Store, generator: PacketGenerator): Promise<boolean> {
  const job = store.claim();
  if (!job) return false;
  try {
    const source = store.get<Source>('source', job.input.sourceId);
    const roadmap = store.get<Roadmap>('roadmap', job.input.roadmapId);
    const node = roadmap?.nodes.find(n => n.id === job.input.nodeId);
    if (!source || !roadmap || !node) throw new Error('Job references missing resources');
    const { packet } = validatePacket(await generator.generate(source, roadmap, node));
    if (packet.roadmapId !== roadmap.id || packet.nodeId !== node.id || packet.sources.some(s => s.sourceId !== source.id)) throw new Error('Generator returned mismatched references');
    store.complete(job.id, packet);
  } catch (error) { console.error('Packet job failed:', job.id, error instanceof Error ? error.name : 'UnknownError'); store.fail(job.id); }
  return true;
}
