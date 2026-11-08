const m = (id, label, category, keywords) => ({ id, label, category, keywords })

export const courses = [
  {
    code: 'BIOL 201',
    department: 'BIOL',
    number: '201',
    title: 'Cell Biology',
    requiredMaterials: [
      m('biol201-text', 'Molecular Biology of the Cell, 6th edition', 'textbook', [
        'cell',
        'molecular',
      ]),
      m('biol201-coat', 'Lab coat', 'lab_gear', ['lab coat', 'coat']),
      m('biol201-goggles', 'Splash goggles', 'lab_gear', ['goggles']),
    ],
    tips: ['Lab coats must be knee length.'],
    relatedCodes: ['CHEM 201', 'CHEM 202'],
  },
  {
    code: 'CHEM 201',
    department: 'CHEM',
    number: '201',
    title: 'Organic Chemistry I',
    requiredMaterials: [
      m('chem201-text', 'Organic Chemistry (Klein), 4th edition', 'textbook', [
        'organic',
        'klein',
      ]),
      m('chem201-kit', 'Molecular model kit', 'lab_gear', [
        'model kit',
        'molecular model',
      ]),
      m('chem201-coat', 'Lab coat, knee length', 'lab_gear', ['lab coat']),
      m('chem201-goggles', 'Splash goggles', 'lab_gear', ['goggles']),
    ],
    tips: [
      'The 3rd edition works. Problem numbers shift in ch. 7 to 9.',
      'Model kits are allowed in the exam room.',
    ],
    relatedCodes: ['CHEM 202', 'BIOL 201'],
  },
  {
    code: 'CHEM 202',
    department: 'CHEM',
    number: '202',
    title: 'Organic Chemistry II',
    requiredMaterials: [
      m('chem202-text', 'Organic Chemistry (Klein), 4th edition', 'textbook', [
        'organic',
        'klein',
      ]),
      m('chem202-kit', 'Molecular model kit', 'lab_gear', ['model kit']),
    ],
    tips: ['Keep your CHEM 201 book. Same text.'],
    relatedCodes: ['CHEM 201', 'BIOL 201'],
  },
  {
    code: 'CSC 201',
    department: 'CSC',
    number: '201',
    title: 'Data Structures',
    requiredMaterials: [
      m('csc201-text', 'Introduction to Algorithms, 4th edition', 'textbook', [
        'algorithms',
        'cormen',
      ]),
    ],
    tips: ['Any 3rd or 4th edition is fine for the first half.'],
    relatedCodes: ['MATH 201', 'EECE 230'],
  },
  {
    code: 'EECE 230',
    department: 'EECE',
    number: '230',
    title: 'Electric Circuits',
    requiredMaterials: [
      m('eece230-text', 'Fundamentals of Electric Circuits', 'textbook', [
        'circuits',
        'alexander',
      ]),
      m('eece230-calc', 'Scientific calculator', 'calculator', [
        'calculator',
        'casio',
        'ti',
      ]),
    ],
    tips: ['Programmable calculators are not allowed in exams.'],
    relatedCodes: ['MATH 201', 'PHYS 210'],
  },
  {
    code: 'MATH 201',
    department: 'MATH',
    number: '201',
    title: 'Calculus III',
    requiredMaterials: [
      m('math201-text', 'Calculus: Early Transcendentals, 8th edition', 'textbook', [
        'calculus',
        'stewart',
      ]),
      m('math201-calc', 'Scientific calculator', 'calculator', ['calculator']),
    ],
    tips: ['Graphing calculators are not allowed in midterms.'],
    relatedCodes: ['STAT 230', 'PHYS 210'],
  },
  {
    code: 'PHYS 210',
    department: 'PHYS',
    number: '210',
    title: 'Electricity and Magnetism',
    requiredMaterials: [
      m('phys210-text', 'University Physics, 15th edition', 'textbook', [
        'physics',
        'young',
      ]),
    ],
    tips: [],
    relatedCodes: ['MATH 201', 'EECE 230'],
  },
  {
    code: 'STAT 230',
    department: 'STAT',
    number: '230',
    title: 'Probability and Statistics',
    requiredMaterials: [
      m('stat230-text', 'Probability and Statistics for Engineers', 'textbook', [
        'probability',
        'statistics',
      ]),
      m('stat230-calc', 'Scientific calculator', 'calculator', ['calculator']),
    ],
    tips: ['A formula sheet is provided in the exam.'],
    relatedCodes: ['MATH 201', 'CSC 201'],
  },
  {
    code: 'BIOL 210',
    department: 'BIOL',
    number: '210',
    title: 'Genetics',
    requiredMaterials: [
      m('biol210-text', 'Genetics: From Genes to Genomes', 'textbook', [
        'genetics',
        'genomes',
      ]),
    ],
    tips: ['Problem sets come from the end of each chapter.'],
    relatedCodes: ['BIOL 201', 'STAT 230'],
  },
  {
    code: 'MATH 218',
    department: 'MATH',
    number: '218',
    title: 'Linear Algebra',
    requiredMaterials: [
      m('math218-text', 'Introduction to Linear Algebra, 5th edition', 'textbook', [
        'linear algebra',
        'strang',
      ]),
    ],
    tips: ['The 4th edition is close enough. Section numbers match.'],
    relatedCodes: ['MATH 201', 'CSC 201'],
  },
  {
    code: 'ECON 211',
    department: 'ECON',
    number: '211',
    title: 'Intermediate Microeconomics',
    requiredMaterials: [
      m('econ211-text', 'Intermediate Microeconomics (Varian)', 'textbook', [
        'microeconomics',
        'varian',
      ]),
      m('econ211-calc', 'Basic calculator', 'calculator', ['calculator']),
    ],
    tips: ['The workouts book is optional but the quizzes come from it.'],
    relatedCodes: ['STAT 230', 'MATH 201'],
  },
  {
    code: 'HIST 201',
    department: 'HIST',
    number: '201',
    title: 'Modern World History',
    requiredMaterials: [
      m('hist201-reader', 'Course reader (print shop)', 'other', ['reader', 'history']),
    ],
    tips: ['The reader changes every term. Check the year on the cover.'],
    relatedCodes: ['ENGL 203'],
  },
  {
    code: 'PSYC 201',
    department: 'PSYC',
    number: '201',
    title: 'Introduction to Psychology',
    requiredMaterials: [
      m('psyc201-text', 'Psychology (Myers), 13th edition', 'textbook', [
        'psychology',
        'myers',
      ]),
    ],
    tips: ['Older editions are fine for reading; quizzes use the 13th.'],
    relatedCodes: ['STAT 230', 'BIOL 201'],
  },
  {
    code: 'ENGL 203',
    department: 'ENGL',
    number: '203',
    title: 'Academic Writing',
    requiredMaterials: [],
    tips: ['No textbook. Readings are posted each week.'],
    relatedCodes: ['HIST 201', 'PSYC 201'],
  },
  {
    code: 'ARCH 221',
    department: 'ARCH',
    number: '221',
    title: 'Architectural Drawing I',
    requiredMaterials: [
      m('arch221-scale', 'Triangular scale ruler', 'other', ['scale', 'ruler']),
      m('arch221-kit', 'Drafting kit with compass', 'other', ['drafting', 'compass']),
      m('arch221-text', 'Architectural Graphics (Ching)', 'textbook', [
        'architectural graphics',
        'ching',
      ]),
    ],
    tips: ['Buy lead holders, not pencils. They last the whole degree.'],
    relatedCodes: ['MATH 218', 'PHYS 210'],
  },
]
