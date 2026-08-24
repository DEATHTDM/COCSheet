import { buildMetadata, type BuildMetadata } from "./buildMetadata";

export interface DiagnosticNavigator {
  readonly userAgent: string;
  readonly language: string;
}

export interface DiagnosticReportInput {
  readonly routePath: string;
  readonly metadata?: BuildMetadata;
  readonly now?: Date;
  readonly navigatorInfo?: DiagnosticNavigator;
  readonly errorCount?: number;
}

const staticDiagnosticRoutes = new Set(["/", "/create", "/kp/presets"]);

export function sanitizeDiagnosticRoute(routePath: string): string {
  const hashRoute = routePath.includes("#/")
    ? routePath.slice(routePath.indexOf("#/") + 1)
    : routePath;
  const pathOnly = hashRoute.split(/[?#]/u, 1)[0] || "/";
  const normalized = pathOnly.startsWith("/") ? pathOnly : `/${pathOnly}`;

  if (staticDiagnosticRoutes.has(normalized)) return normalized;
  if (/^\/characters\/[^/]+\/sheet\/?$/u.test(normalized)) return "/characters/:id/sheet";
  if (/^\/characters\/[^/]+\/print\/?$/u.test(normalized)) return "/characters/:id/print";
  if (/^\/characters\/[^/]+\/?$/u.test(normalized)) return "/characters/:id";
  if (/^\/kp\/presets\/[^/]+\/?$/u.test(normalized)) return "/kp/presets/:id";
  return "/（未知页面）";
}

function defaultNavigatorInfo(): DiagnosticNavigator {
  if (typeof navigator === "undefined") return { userAgent: "unknown", language: "unknown" };
  return {
    userAgent: navigator.userAgent || "unknown",
    language: navigator.language || "unknown",
  };
}

export function createDiagnosticReport(input: DiagnosticReportInput): string {
  const metadata = input.metadata ?? buildMetadata;
  const now = input.now ?? new Date();
  const navigatorInfo = input.navigatorInfo ?? defaultNavigatorInfo();
  const lines = [
    `COCSheet version: ${metadata.version}`,
    `Build SHA: ${metadata.buildSha}`,
    `Time: ${now.toISOString()}`,
    `Browser: ${navigatorInfo.userAgent}`,
    `Language: ${navigatorInfo.language}`,
    `Route: ${sanitizeDiagnosticRoute(input.routePath)}`,
  ];
  if (input.errorCount !== undefined) lines.push(`Runtime error count: ${input.errorCount}`);
  return `${lines.join("\n")}\n`;
}
