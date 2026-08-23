export interface JsonDownload {
  readonly text: string;
  readonly filename: string;
  readonly mimeType: "application/json;charset=utf-8";
}

export function downloadJsonFile(download: JsonDownload): void {
  const objectUrl = URL.createObjectURL(new Blob([download.text], { type: download.mimeType }));
  const anchor = document.createElement("a");
  try {
    anchor.href = objectUrl;
    anchor.download = download.filename;
    anchor.hidden = true;
    document.body.append(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  }
}
