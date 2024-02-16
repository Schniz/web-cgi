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

  if (process.env.CONTENT_TYPE) {
    headers.set("content-type", process.env.CONTENT_TYPE);
  }
  if (process.env.CONTENT_LENGTH) {
    headers.set("content-length", process.env.CONTENT_LENGTH);
  }

  const method = process.env.REQUEST_METHOD;
  const url = `${/https/i.test(process.env.SERVER_PROTOCOL ?? "") ? "https" : "http"}://${process.env.SERVER_NAME}:${process.env.SERVER_PORT}${process.env.REQUEST_URI}`;

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
  } else {
    console.log(`Status: ${response.status} OK`);
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
