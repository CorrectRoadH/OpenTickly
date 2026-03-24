import { buildRobotsTxt } from "@/lib/seo";

export function loader() {
  return new Response(buildRobotsTxt(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
