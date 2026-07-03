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
};

export type PoolGroup = {
  poolName: string;
  items: { id: string; title: string; url: string; humanStatus: string; priority: string }[];
};
