export type InboxSignal = {
  id: string;
  title: string;
  url: string;
  priority: string;
  suggestedPool: string;
  finalPool: string;
  humanStatus: string;
  readingPackStatus: string;
  summary: string;
  priorityRationale?: string;
  poolRationale?: string;
  contentTags?: string[];
};

export type PoolGroup = {
  poolName: string;
  items: {
    id: string;
    title: string;
    url: string;
    humanStatus: string;
    status: string | null;
    finalPool: string | null;
    priority: string;
    summary: string;
    hasLinkedTask: boolean;
    hasLinkedArtifact: boolean;
  }[];
};

export type PendingBacklogSignal = {
  id: string;
  title: string;
  url: string;
  date: string | null;
  priority: string;
  suggestedPool: string;
  finalPool: string;
};
