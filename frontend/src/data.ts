import { parsePacket } from './model.ts';
import type { Session } from './model.ts';
const roadmapId = '719cd9ac-3dfd-4e31-b09c-6a4ebdc931a6';
export const starterSession: Session = {
  mode: 'starter', profile: { targetCareer: 'Flutter Mobile Developer', region: 'Choose your region', experience: 'beginner', minutesPerDay: 15 },
  roadmap: { id: roadmapId, targetCareer: 'Flutter Mobile Developer', learnerId: 'f592befa-0560-4a86-bc0f-2bbcf6c21939', status: 'curated-template', marketEvidence: null, createdAt: '2026-10-13T00:00:00.000Z', nodes: [
    { id: 'dart', title: 'Dart fundamentals', objective: 'Understand variables and write your first Dart function.', prerequisites: [], careerTask: 'Write the small pieces of logic behind a mobile app.' },
    { id: 'widgets', title: 'Widgets & layouts', objective: 'Build a Flutter screen from reusable widgets.', prerequisites: ['dart'], careerTask: 'Turn a product design into a mobile screen.' },
    { id: 'state', title: 'State & interaction', objective: 'Make a screen respond to user input.', prerequisites: ['widgets'], careerTask: 'Build interactive app features.' },
    { id: 'storage', title: 'Offline data', objective: 'Save user data between app sessions.', prerequisites: ['state'], careerTask: 'Keep apps useful during interrupted connectivity.' },
    { id: 'network', title: 'APIs & networking', objective: 'Handle loading, data, and errors.', prerequisites: ['storage'], careerTask: 'Connect a mobile app to a backend.' },
    { id: 'project', title: 'Your first real project', objective: 'Build and test a small app that solves a problem.', prerequisites: ['network'], careerTask: 'Show your work in a practical portfolio.' },
  ] },
};
export const starterPacket = parsePacket({
  id: 'c2b60bbb-b122-4668-9f8a-7f7a72eca55c', version: 1, roadmapId, nodeId: 'dart', title: 'Dart fundamentals', language: 'en', estimatedMinutes: 5,
  objective: 'Recognize variables and functions, then write a small greeting function.', prerequisites: [],
  summary: 'Every app begins with a few building blocks. A variable gives a value a name so you can use it later. A function groups instructions into a reusable piece of work.\n\nIn Dart, you can use var to let the language infer a variable’s type. Use final when you will assign a variable only once. A function can receive an input and return a result.\n\nStart small: store a name, pass it to a greeting function, and print the returned message. These same ideas help a mobile app format a profile name or calculate an order total.',
  takeaways: ['Variables give names to values.', 'final variables can be assigned only once.', 'Functions make a piece of logic reusable.'],
  workedExample: "String greet(String name) {\n  return 'Hello, $name!';\n}\n\nvoid main() {\n  final name = 'Ada';\n  print(greet(name));\n}\n\n// Output: Hello, Ada!",
  practicalTask: 'Change the function to return “Welcome back, Ada!” when you pass in Ada. Then try a second name. Explain what the function receives and what it returns.',
  narrationScript: 'Every app begins with a few building blocks. A variable gives a value a name. A function groups instructions into reusable work. In Dart, final means a variable can be assigned only once. Try writing a greeting function that receives a name and returns a welcome message.',
  quiz: [
    { id: 'variables', question: 'Which keyword makes a Dart variable assignable only once?', options: ['var', 'final', 'return'], correctIndex: 1, explanation: 'A final variable can be assigned only once. The value itself is not necessarily an immutable object.' },
    { id: 'functions', question: 'What does greet(name) return in the example?', options: ['A greeting string', 'A new mobile screen', 'An internet connection'], correctIndex: 0, explanation: 'The function receives a name and returns a formatted greeting string.' },
  ],
  careerConnection: 'Greeting a returning user is a small example of the formatting logic you will write in a mobile application.',
  sources: [{ sourceId: '72c7aa6f-0f4f-4cc5-9f95-3d0412a5b48e', title: 'SkillPacket starter lesson', locator: 'Hand-authored introductory example' }],
  generator: 'starter-lesson-v1', reviewStatus: 'unreviewed', createdAt: '2026-10-13T00:00:00.000Z',
});
