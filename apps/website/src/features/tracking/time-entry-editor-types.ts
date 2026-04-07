export type TimeEntryEditorAnchor = {
  containerHeight?: number;
  containerWidth?: number;
  height: number;
  left: number;
  preferredPlacement?: "left" | "right";
  top: number;
  width: number;
};

export type TimeEntryEditorProject = {
  clientName?: string;
  color: string;
  id: number;
  name: string;
  pinned?: boolean;
};

export type TimeEntryEditorTag = {
  id: number;
  name: string;
};

export type TimeEntryEditorWorkspace = {
  id: number;
  isCurrent?: boolean;
  name: string;
};
