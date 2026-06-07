declare global {
  namespace PrismaJson {
    type CommissionAnswer = {
      type: 'TEXT' | 'SINGLE_SELECT' | 'MULTI_SELECT';
      title: string;
      description: string | null;
      isRequired: boolean;
      options: string[];
      text: string | null;
      selectedOptions: string[];
      attachedImages: string[];
    };
  }
}

// This file must be a module.
export {};
