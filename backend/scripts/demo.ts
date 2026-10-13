const base = process.env.API_URL ?? 'http://127.0.0.1:3001';
async function request(path: string, body?: unknown): Promise<any> {
  const response = await fetch(base + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(process.env.API_TOKEN ? { Authorization: `Bearer ${process.env.API_TOKEN}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(JSON.stringify(result));
  return result;
}
const learner = await request('/v1/learners', { targetCareer: 'Flutter Mobile Developer', region: 'Lagos, Nigeria', minutesPerDay: 15 });
const roadmap = await request(`/v1/learners/${learner.id}/roadmaps`, {});
const source = await request('/v1/sources', { title: 'Dart introductory notes', kind: 'text', text: 'Dart variables hold values. Functions organize reusable logic. Collections group related values so a program can process them. Start by writing a function that returns a greeting.' });
const queued = await request('/v1/packet-jobs', { roadmapId: roadmap.id, nodeId: 'dart', sourceId: source.id });
let job = queued;
for (let attempt = 0; attempt < 40 && ['queued', 'running'].includes(job.status); attempt++) {
  await new Promise(resolve => setTimeout(resolve, 250));
  job = await request(`/v1/jobs/${queued.id}`);
}
if (job.status !== 'succeeded') throw new Error(`Generation ended with status ${job.status}`);
const packet = await request(`/v1/packets/${job.packetId}/download`);
console.log(JSON.stringify({ learnerId: learner.id, roadmapId: roadmap.id, jobId: job.id, packetId: packet.id, bytes: Buffer.byteLength(JSON.stringify(packet)), generator: packet.generator, downloadUrl: `${base}/v1/packets/${packet.id}/download` }, null, 2));
