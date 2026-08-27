import { createRouter, createWebHashHistory } from "vue-router";

import CharacterEditorPage from "../../pages/CharacterEditorPage.vue";
import CreateCharacterPage from "../../pages/CreateCharacterPage.vue";
import FinalCharacterSheetPage from "../../pages/FinalCharacterSheetPage.vue";
import HomePage from "../../pages/HomePage.vue";
import KPPresetEditorPage from "../../pages/KPPresetEditorPage.vue";
import KPPresetsPage from "../../pages/KPPresetsPage.vue";
import LegalPage from "../../pages/LegalPage.vue";
import NotFoundPage from "../../pages/NotFoundPage.vue";
import PrintableCharacterSheetPage from "../../pages/PrintableCharacterSheetPage.vue";

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: "/", name: "home", component: HomePage },
    { path: "/create", name: "create", component: CreateCharacterPage },
    { path: "/characters/:id", name: "character", component: CharacterEditorPage },
    { path: "/characters/:id/sheet", name: "character-sheet", component: FinalCharacterSheetPage },
    { path: "/characters/:id/print", name: "character-print", component: PrintableCharacterSheetPage },
    { path: "/kp/presets", name: "presets", component: KPPresetsPage },
    { path: "/kp/presets/:id", name: "preset", component: KPPresetEditorPage },
    { path: "/legal", name: "legal", component: LegalPage },
    { path: "/:pathMatch(.*)*", name: "not-found", component: NotFoundPage },
  ],
});
