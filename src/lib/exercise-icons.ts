import {
  faHeart,
  faDumbbell,
  faWeightHanging,
  faSpa,
  faPersonWalking,
  faPersonSwimming,
  faPersonRunning,
  faPersonBiking,
  faHeartPulse,
  faFireFlameSimple,
  faFireFlameCurved,
  IconDefinition
} from '@fortawesome/free-solid-svg-icons';

export interface ExerciseIcon {
  iconDef: IconDefinition;
  name: string;
  keywords: string[];
}

export const exerciseIcons: ExerciseIcon[] = [
  {
    iconDef: faDumbbell,
    name: 'dumbbell',
    keywords: ['strength', 'weight', 'lifting', 'gym', 'power']
  },
  {
    iconDef: faFireFlameSimple,
    name: 'fire-flame-simple',
    keywords: ['core', 'abs', 'plank', 'intensity']
  },
  {
    iconDef: faPersonRunning,
    name: 'person-running',
    keywords: ['run', 'sprint', 'cardio']
  },
  {
    iconDef: faPersonBiking,
    name: 'person-biking',
    keywords: ['cycling', 'bike', 'cardio']
  },
  {
    iconDef: faPersonWalking,
    name: 'person-walking',
    keywords: ['walk', 'hike', 'cardio']
  },
  {
    iconDef: faPersonSwimming,
    name: 'person-swimming',
    keywords: ['swim', 'pool', 'cardio']
  },
  {
    iconDef: faHeartPulse,
    name: 'heart-pulse',
    keywords: ['cardio', 'heart', 'intensity']
  },
  {
    iconDef: faHeart,
    name: 'heart',
    keywords: ['cardio', 'health', 'endurance']
  },
  {
    iconDef: faWeightHanging,
    name: 'weight-hanging',
    keywords: ['weight', 'strength', 'gym']
  },
  {
    iconDef: faSpa,
    name: 'spa',
    keywords: ['wellness', 'balance', 'flexibility']
  },
  {
    iconDef: faFireFlameCurved,
    name: 'fire-flame-curved',
    keywords: ['intensity', 'power', 'energy']
  }
];

export function findIconByName(name: string): ExerciseIcon {
  return exerciseIcons.find(icon => icon.name === name) || exerciseIcons[0];
}

export function findIconsByKeywords(search: string): ExerciseIcon[] {
  const searchTerms = search.toLowerCase().split(' ');
  return exerciseIcons.filter(icon => 
    searchTerms.some(term => 
      icon.keywords.some(keyword => keyword.includes(term)) ||
      icon.name.includes(term)
    )
  );
}