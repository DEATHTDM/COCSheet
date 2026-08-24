import { issueChooserUrl, repositoryUrl } from "../releaseLinks";

function createLink(label: string, href: string): HTMLAnchorElement {
  const link = document.createElement("a");
  link.className = "button";
  link.textContent = label;
  link.href = href;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  return link;
}

export function renderBootstrapFailure(root: HTMLElement | null): void {
  if (!root) return;
  root.replaceChildren();

  const shell = document.createElement("main");
  shell.className = "bootstrap-fallback panel page-stack";
  const brand = document.createElement("p");
  brand.className = "eyebrow";
  brand.textContent = "COCSheet";
  const heading = document.createElement("h1");
  heading.textContent = "应用启动失败";
  const message = document.createElement("p");
  message.textContent = "页面未能正常启动。你可以重新载入，或前往项目页面反馈问题。";
  const actions = document.createElement("div");
  actions.className = "actions";
  const reload = document.createElement("button");
  reload.className = "button primary";
  reload.type = "button";
  reload.textContent = "重新载入页面";
  reload.addEventListener("click", () => window.location.reload());
  actions.append(reload, createLink("GitHub 项目", repositoryUrl), createLink("反馈问题", issueChooserUrl));
  shell.append(brand, heading, message, actions);
  root.append(shell);
}
