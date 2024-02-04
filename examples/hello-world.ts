import { cgi } from "../src";

cgi(async (request) => {
  return new Response(`Hello, world from ${request.method} ${request.url}`, {
    status: 201,
    headers: {
      "x-galaxy": "far, far away",
    },
  });
});
