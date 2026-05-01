export interface CreateTutorPayload {
  bio: string;
  subjects: string[];
  price: number;
}

export type UpdateTutorPayload = Partial<CreateTutorPayload>;
