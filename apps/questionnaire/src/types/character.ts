export type Character = {
  id: string;
  name: string;
  persona: Persona;
  qualification?: Qualification;
  responsibilities?: Responsibilities;
  tone?: Tone;
  guardrails?: Guardrails;
  eiModel?: EIModel;
  collectionStrategy?: CollectionStrategy;
  datapoints?: CharacterDatapoint[];
};

export type Persona = {
  role?: string;
  age?: string;
  location?: string;
  experience?: string;
  education?: string;
  languageStyle?: string;
  traits?: string;
  archetype?: string;
  iq?: string;
  systemIntent?: string;
};

export type Qualification = {
  areas?: string;
  skills?: string;
};

export type Responsibilities = {
  functional?: string;
  emotional?: string;
  outputs?: string;
};

export type Tone = {
  primary?: string;
  secondary?: string;
  examples?: { neutral?: string; encouraging?: string; supportive?: string };
};

export type Guardrails = {
  pricing?: string;
  scope?: string;
  representation?: string;
  accuracy?: string;
  inclusivity?: string;
};

export type EIModel = {
  sentiment?: boolean;
  empathyTemplates?: boolean;
  pacing?: { adaptive?: boolean };
};

export type CollectionStrategy = {
  style?: string;
  maxTurnsBeforeDirectAsk?: number;
};

export type CharacterDatapoint = {
  id: string;
  label?: string;
  priority?: number;
  hint?: string;
  allowMultiple?: boolean;
};

