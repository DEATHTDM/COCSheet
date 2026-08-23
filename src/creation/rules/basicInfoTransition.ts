export interface BasicInfoTransitionInput {
  readonly sex: string;
  readonly residence: string;
  readonly birthplace: string;
  readonly eraRequired: boolean;
  readonly eraId: string | undefined;
}

export function validateBasicInfoTransition(
  input: BasicInfoTransitionInput,
): readonly string[] {
  const errors: string[] = [];
  if (!input.sex.trim() || !input.residence.trim() || !input.birthplace.trim()) {
    errors.push("请填写性别、住所与出身地。");
  }
  if (input.eraRequired && !input.eraId) {
    errors.push("请选择建卡时代。");
  }
  return errors;
}
