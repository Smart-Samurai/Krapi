import { 
  LayoutDashboard, 
  Database, 
  HardDrive, 
  Users, 
  Settings,
  KeyRound,
  TestTube2
} from 'lucide-react';

export const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Projects',
    href: '/projects',
    icon: Settings,
  },
  {
    name: 'Collections',
    href: '/collections',
    icon: Database,
  },
  {
    name: 'Storage',
    href: '/storage',
    icon: HardDrive,
  },
  {
    name: 'Admin Users',
    href: '/admin-users',
    icon: Users,
  },
  {
    name: 'API Keys',
    href: '/api-keys',
    icon: KeyRound,
  },
  {
    name: 'Test Access',
    href: '/test-access',
    icon: TestTube2,
  },
];
