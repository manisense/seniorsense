export interface ProfileTypes {
  userProfile: {
    name: string;
    age: number;
    medicalConditions?: string[];
    medications?: string[];
  };
}