const PROFANITY_LIST = [
  'damn',
  'shit',
  'fuck',
  'fucking',
  'bitch',
  'bastard',
  'asshole',
  'crap',
  'piss',
  'dick',
  'cock',
  'pussy',
  'whore',
  'slut',
  'gay',
  'lesbian',
  'fag',
  'retard',
  'stupid',
  'idiot',
  'moron',
  'dumb',
  'ass',
  'bullshit',
  'horseshit',
  'bullshitter',
  'hell',
  'cunt',
  'arse',
  'bugger',
  'twat',
  'wanker',
  'shite',
  'prick',
  'git',
  'tosser',
  'motherfucker',
  'assclown',
  'douchebag',
  'jackass',
  'smartass',
  'fatass',
  'dipshit',
  'fuckwad',
  'shithead',
  'chickenshit',
  'turd',
  'turdburger',
  'dillhole',
  'buttmunch',
  'buttface',
  'clitface',
  'pussyface',
  'cocksucker',
  'motherfucking',
  'fucked',
  'fuckhead',
  'asswipe',
  'assclown',
  'bastardize',
  'bitchy',
  'bitching',
  'bitch ass',
  'biatch',
  'craphole',
  'fuckface',
  'shit-eating',
  'damned',
  'damn it',
  'goddamn',
  'goddamned',
  'crap shoot',
  'crappy',
];

export const censorText = (text: string): string => {
  if (!text) return text;

  let censoredText = text;

  PROFANITY_LIST.forEach((word) => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const replacement = '*'.repeat(word.length);
    censoredText = censoredText.replace(regex, replacement);
  });

  return censoredText;
};

export default censorText;
