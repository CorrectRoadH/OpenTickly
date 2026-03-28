import type { Route } from "./+types/not-found";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { Link } from "react-router";
import { baseOptions } from "@/lib/layout.shared";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Page Not Found | OpenToggl" },
    { name: "description", content: "The page you are looking for does not exist. Return to the OpenToggl documentation or homepage." },
    { name: "robots", content: "noindex,nofollow" },
  ];
}

export default function NotFound() {
  return (
    <HomeLayout {...baseOptions()}>
      <div className="p-4 flex flex-col items-center justify-center text-center flex-1">
        <h1 className="text-xl font-bold mb-2">Not Found</h1>
        <p className="text-fd-muted-foreground mb-4">This page could not be found.</p>
        <Link
          className="text-sm bg-fd-primary text-fd-primary-foreground rounded-full font-medium px-4 py-2.5"
          to="/docs"
        >
          Back to Docs
        </Link>
      </div>
    </HomeLayout>
  );
}
