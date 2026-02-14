// @generated - DO NOT EDIT BY HAND
// To update this file, run: npm run update-sources

export type Code = 
  | '10'
  | '21'
  | '26'
  | '28'
  | '31'
  | '32'
  | '35'
  | '36'
  | '37'
  | '38'
  | '39'
  | '40'
  | '50'
  | '60'
  | '69'
  | '70'
  | '80'
  | '81'
  | '82'
  | '83'
  | '84'
  | '85'
  | '86'
  | '91'
  | '92'
  | '93'
  | '94'
  | '95'
  | '96'
  | '98';

export type Display = 
  | 'Médecin'
  | 'Pharmacien'
  | 'Audioprothésiste'
  | 'Opticien-Lunetier'
  | 'Assistant dentaire'
  | 'Physicien médical'
  | 'Aide-soignant'
  | 'Ambulancier'
  | 'Auxiliaire de puériculture'
  | 'Préparateur en pharmacie hospitalière'
  | 'Préparateur en pharmacie (officine)'
  | 'Chirurgien-Dentiste'
  | 'Sage-Femme'
  | 'Infirmier'
  | 'Infirmier psychiatrique'
  | 'Masseur-Kinésithérapeute'
  | 'Pédicure-Podologue'
  | 'Orthoprothésiste'
  | 'Podo-Orthésiste'
  | 'Orthopédiste-Orthésiste'
  | 'Oculariste'
  | 'Epithésiste'
  | 'Technicien de laboratoire médical'
  | 'Orthophoniste'
  | 'Orthoptiste'
  | 'Psychologue'
  | 'Ergothérapeute'
  | 'Diététicien'
  | 'Psychomotricien'
  | 'Manipulateur ERM';

export interface FlattenedConcept {
  code: Code;
  display: Display;
  dateValid?: string;
  dateMaj?: string;
  status?: string;
  dateFin?: string;
  deprecationDate?: string;
}

export interface TerminologyData {
  resourceType: string;
  url: string;
  version: string;
  name: string;
  status: string;
  experimental: boolean;
  date: string;
  publisher: string;
  description: string;
  concept: Array<{
    code: Code;
    display: Display;
    property?: Array<{
      code: string;
      valueCode?: string;
      valueDateTime?: string;
      valueString?: string;
      valueBoolean?: boolean;
    }>;
  }>;
}

export type Data = TerminologyData;
