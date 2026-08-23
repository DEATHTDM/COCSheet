interface KPPresetShareRouteResolver {
  resolve(location: {
    readonly name: "create";
    readonly query: { readonly kp: string };
  }): { readonly href: string };
}

export function buildKPPresetShareUrl(
  token: string,
  router: KPPresetShareRouteResolver,
  currentHref: string = window.location.href,
): string {
  const routeHref = router.resolve({
    name: "create",
    query: { kp: token },
  }).href;
  return new URL(routeHref, currentHref).href;
}
