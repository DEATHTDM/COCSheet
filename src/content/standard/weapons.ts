import type { WeaponDefinition } from "../../coc7/types/weapon";

import { standardAssaultRifles } from "./weapons/assaultRifles";
import { standardExplosiveHeavyOtherWeapons } from "./weapons/explosiveHeavyOther";
import { standardHandguns } from "./weapons/handguns";
import { standardMachineGuns } from "./weapons/machineGuns";
import { standardMeleeOtherWeapons } from "./weapons/meleeOther";
import { standardRifles } from "./weapons/rifles";
import { standardShotguns } from "./weapons/shotguns";
import { standardSubmachineGuns } from "./weapons/submachineGuns";

export const standardWeaponDefinitions: readonly WeaponDefinition[] = [
  ...standardMeleeOtherWeapons,
  ...standardHandguns,
  ...standardRifles,
  ...standardShotguns,
  ...standardAssaultRifles,
  ...standardSubmachineGuns,
  ...standardMachineGuns,
  ...standardExplosiveHeavyOtherWeapons,
];
