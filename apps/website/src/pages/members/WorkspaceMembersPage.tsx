import React from "react";

type Member = {
  id: string;
  workspace_id: string;
  email: string;
  name: string;
  role: string;
};

const sampleMembers: Member[] = [
  {
    id: "mem-1",
    workspace_id: "ws-123",
    email: "alex@example.com",
    name: "Alex Johnson",
    role: "owner",
  },
  {
    id: "mem-2",
    workspace_id: "ws-123",
    email: "bailey@example.com",
    name: "Bailey Lee",
    role: "admin",
  },
  {
    id: "mem-3",
    workspace_id: "ws-123",
    email: "casey@example.com",
    name: "Casey Smith",
    role: "member",
  },
];

export const WorkspaceMembersPage: React.FC = () => {
  return (
    <main aria-label="workspace-members" className="p-6 space-y-4">
      <header className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Workspace Members</h1>
          <p className="text-sm text-gray-600">
            Members sourced from the workspace contract data.
          </p>
        </div>
        <button
          type="button"
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          Invite members
        </button>
      </header>

      <section
        aria-label="Workspace members list"
        data-testid="members-list"
        className="border rounded-lg divide-y"
      >
        {sampleMembers.map((member) => (
          <article
            key={member.id}
            className="p-4 grid grid-cols-[2fr_2fr_1fr] gap-2"
            data-member-id={member.id}
          >
            <div className="font-medium">{member.name}</div>
            <div className="text-gray-700">{member.email}</div>
            <div className="text-gray-500 uppercase tracking-wide">
              {member.role}
            </div>
            <dl className="sr-only">
              <div>
                <dt>Member ID</dt>
                <dd>{member.id}</dd>
              </div>
              <div>
                <dt>Workspace ID</dt>
                <dd>{member.workspace_id}</dd>
              </div>
            </dl>
          </article>
        ))}
      </section>
    </main>
  );
};

export default WorkspaceMembersPage;
