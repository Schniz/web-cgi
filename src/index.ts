import { Readable } from "stream";

function envToRequest() {
  const headers = new Headers();

  for (const [key, value] of Object.entries(process.env)) {
    if (!key.startsWith("HTTP_") || !value) {
      continue;
    }

    const header = key.substring(5).toLowerCase().replace(/_/g, "-");
    headers.set(header, value);
  }

  const method = process.env.REQUEST_METHOD;
  const url = process.env.REQUEST_URI;

  if (!url) {
    throw new Error("REQUEST_URI not set");
  }

  return new Request(url, {
    method: method,
    headers,
    ...(!["GET", "HEAD", "OPTIONS"].includes(method || "GET")
      ? { body: Readable.toWeb(process.stdin) as ReadableStream<Uint8Array> }
      : {}),
  });
}

async function printResponse(response: Response) {
  if (response.status !== 200) {
    console.log(`Status: ${response.status}`);
  }

  for (const [key, value] of response.headers) {
    console.log(`${key}: ${value}`);
  }

  console.log();

  if (!response.body) {
    return;
  }

  const reader = response.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (value) {
      process.stdout.write(value);
    }
    if (done) {
      break;
    }
  }
}

export async function cgi(
  fn: (request: Request) => Promise<Response>,
): Promise<void> {
  await printResponse(await fn(envToRequest()));
}
