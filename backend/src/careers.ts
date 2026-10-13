export const careerNames = ['Flutter Mobile Developer', 'Solar Inverter Technician', 'Frontend Web Developer', 'Data Analyst'] as const;
export type CareerName = typeof careerNames[number];
export type SkillNode = { id: string; title: string; objective: string; prerequisites: string[]; careerTask: string };
export type CareerDefinition = { title: CareerName; description: string; icon: 'code' | 'leaf' | 'book' | 'route'; guidance?: string; nodes: SkillNode[] };
export const careers: Record<CareerName, CareerDefinition> = {
  'Flutter Mobile Developer': {
    title: 'Flutter Mobile Developer', icon: 'code', description: 'From your first line of Dart to an app you can call your own.',
    nodes: [
      { id: 'dart', title: 'Dart fundamentals', objective: 'Write a small Dart program using variables, functions, and collections.', prerequisites: [], careerTask: 'Implement application logic.' },
      { id: 'widgets', title: 'Widgets and layouts', objective: 'Build a responsive Flutter screen from reusable widgets.', prerequisites: ['dart'], careerTask: 'Turn a product design into a mobile screen.' },
      { id: 'state', title: 'State and user interaction', objective: 'Update a screen in response to user input.', prerequisites: ['widgets'], careerTask: 'Build interactive application features.' },
      { id: 'storage', title: 'Local data and offline behavior', objective: 'Save user data and restore it after restarting an app.', prerequisites: ['state'], careerTask: 'Keep an application useful during interrupted connectivity.' },
      { id: 'network', title: 'APIs and error handling', objective: 'Read an API response and handle loading and failure states.', prerequisites: ['storage'], careerTask: 'Integrate a mobile app with backend services.' },
      { id: 'project', title: 'Portfolio project and testing', objective: 'Build and test a small app that solves a user problem.', prerequisites: ['network'], careerTask: 'Demonstrate implementation skills with a working project.' },
    ],
  },
  'Solar Inverter Technician': {
    title: 'Solar Inverter Technician', icon: 'leaf', description: 'Understand solar systems, build diagnostic knowledge, and prepare for supervised practical training.',
    guidance: 'This pathway is preparation for supervised training. Electrical work requires qualified supervision and equipment-specific safety procedures; these previews do not qualify you to install or repair equipment.',
    nodes: [
      { id: 'solar-safety', title: 'Safety and work boundaries', objective: 'Identify electrical hazards, the limits of your training, and when qualified supervision is required.', prerequisites: [], careerTask: 'Recognize situations that require escalation before practical work.' },
      { id: 'electrical-basics', title: 'Electrical fundamentals', objective: 'Explain voltage, current, power, and the difference between AC and DC using written examples.', prerequisites: ['solar-safety'], careerTask: 'Understand the quantities used in equipment documentation.' },
      { id: 'system-components', title: 'Solar system components', objective: 'Describe the roles of panels, charge controllers, batteries, inverters, and protective devices.', prerequisites: ['electrical-basics'], careerTask: 'Read a system diagram and identify major components.' },
      { id: 'load-planning', title: 'Loads and documentation', objective: 'Organize an example load inventory and interpret manufacturer ratings with an instructor.', prerequisites: ['system-components'], careerTask: 'Prepare clear information for a qualified system designer.' },
      { id: 'diagnostic-records', title: 'Faults and service records', objective: 'Use supplied case studies and manuals to document symptoms and propose questions for a supervisor.', prerequisites: ['load-planning'], careerTask: 'Communicate service findings without attempting unqualified repairs.' },
      { id: 'supervised-capstone', title: 'Supervised learning portfolio', objective: 'Compile an instructor-reviewed case study and a record of supervised training activities.', prerequisites: ['diagnostic-records'], careerTask: 'Demonstrate learning and readiness for further practical training.' },
    ],
  },
  'Frontend Web Developer': {
    title: 'Frontend Web Developer', icon: 'code', description: 'Build accessible web pages, add interaction, and publish a practical portfolio.',
    nodes: [
      { id: 'html', title: 'HTML and page structure', objective: 'Build a page with meaningful headings, links, images, and forms.', prerequisites: [], careerTask: 'Translate content into a structured web page.' },
      { id: 'css', title: 'CSS and responsive layouts', objective: 'Style a page that adapts to mobile and desktop widths.', prerequisites: ['html'], careerTask: 'Implement a visual design across screen sizes.' },
      { id: 'javascript', title: 'JavaScript fundamentals', objective: 'Use variables, functions, and events to add interaction.', prerequisites: ['css'], careerTask: 'Build interactive controls and validate form input.' },
      { id: 'accessibility', title: 'Accessible interfaces', objective: 'Check keyboard navigation, labels, contrast, and feedback in a small interface.', prerequisites: ['javascript'], careerTask: 'Make web features usable for more people.' },
      { id: 'react', title: 'React and application state', objective: 'Build reusable components and manage a small application’s state.', prerequisites: ['accessibility'], careerTask: 'Organize an interface into maintainable features.' },
      { id: 'web-portfolio', title: 'Testing and portfolio', objective: 'Test and publish a small responsive web app with a project explanation.', prerequisites: ['react'], careerTask: 'Show a working project and explain implementation decisions.' },
    ],
  },
  'Data Analyst': {
    title: 'Data Analyst', icon: 'book', description: 'Turn a question into clean data, useful analysis, and a story people can act on.',
    nodes: [
      { id: 'data-questions', title: 'Questions and data literacy', objective: 'Define a useful question, identify needed data, and distinguish observations from assumptions.', prerequisites: [], careerTask: 'Translate a stakeholder’s question into an analysis plan.' },
      { id: 'spreadsheets', title: 'Spreadsheets and cleaning', objective: 'Organize a sample dataset, find missing values, and produce a basic summary.', prerequisites: ['data-questions'], careerTask: 'Prepare consistent data for analysis.' },
      { id: 'sql', title: 'SQL and querying', objective: 'Filter, group, and join sample tables to answer a question.', prerequisites: ['spreadsheets'], careerTask: 'Retrieve relevant records from a database.' },
      { id: 'statistics', title: 'Practical statistics', objective: 'Interpret averages, distributions, and uncertainty without overstating conclusions.', prerequisites: ['sql'], careerTask: 'Explain patterns and the limits of a dataset.' },
      { id: 'visualization', title: 'Charts and communication', objective: 'Choose a clear chart and write a short evidence-based explanation.', prerequisites: ['statistics'], careerTask: 'Communicate findings to a nontechnical audience.' },
      { id: 'analysis-portfolio', title: 'Analysis portfolio', objective: 'Complete a documented analysis using a public or synthetic dataset.', prerequisites: ['visualization'], careerTask: 'Present a reproducible project while respecting data privacy.' },
    ],
  },
};
export const careerCatalog = careerNames.map(name => {
  const { nodes, ...metadata } = careers[name];
  return { ...metadata, milestoneCount: nodes.length };
});
