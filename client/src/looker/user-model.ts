export interface AgentUser {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Analyst' | 'Developer' | 'Viewer';
  avatarInitials: string;
  avatarColor: string;
}

export const PRESET_DEVS: AgentUser[] = [
  {
    id: 'dev_local',
    name: 'Local Developer',
    email: 'dev@localhost',
    role: 'Developer',
    avatarInitials: 'LD',
    avatarColor: '#388bfd',
  },
  {
    id: 'dev_alice',
    name: 'Alice Henderson',
    email: 'alice@company.internal',
    role: 'Admin',
    avatarInitials: 'AH',
    avatarColor: '#bc8cff',
  },
  {
    id: 'dev_bob',
    name: 'Bob Martinez',
    email: 'bob@company.internal',
    role: 'Analyst',
    avatarInitials: 'BM',
    avatarColor: '#2ea043',
  },
];
