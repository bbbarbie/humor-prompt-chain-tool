export type PrimitiveId = string | number;

export type ProfileAccess = {
  id: string;
  is_superadmin: boolean | null;
  is_matrix_admin: boolean | null;
};

export type HumorFlavor = {
  id: PrimitiveId;
  created_datetime_utc: string | null;
  description: string | null;
  slug: string | null;
  created_by_user_id: string | null;
  modified_by_user_id: string | null;
  modified_datetime_utc: string | null;
};

export type HumorFlavorStep = {
  id: PrimitiveId;
  created_datetime_utc: string | null;
  humor_flavor_id: PrimitiveId;
  llm_temperature: number | null;
  order_by: number | null;
  llm_input_type_id: PrimitiveId | null;
  llm_output_type_id: PrimitiveId | null;
  llm_model_id: PrimitiveId | null;
  humor_flavor_step_type_id: PrimitiveId | null;
  llm_system_prompt: string | null;
  llm_user_prompt: string | null;
};

export type FlavorSummary = HumorFlavor & {
  stepCount: number;
};

export type SelectOption = {
  id: PrimitiveId;
  label: string;
};

export type TestImage = {
  id: PrimitiveId;
  url: string | null;
  image_description: string | null;
  additional_context: string | null;
  created_datetime_utc: string | null;
};

export type StudioRunResult = {
  id: string;
  flavorId: string;
  flavorName: string;
  imageId: string;
  imageUrl: string | null;
  createdAt: string;
  captions: string[];
};
