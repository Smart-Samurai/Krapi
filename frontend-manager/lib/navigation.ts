import { 
  FiHome, 
  FiFolder, 
  FiUsers, 
  FiDatabase,
  FiHardDrive,
  FiSettings,
  FiLogOut,
  FiChevronRight
} from 'react-icons/fi';

export interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  children?: NavItem[];
}

export const mainNavigation: NavItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: FiHome,
  },
  {
    name: "Projects",
    href: "/projects",
    icon: FiFolder,
  },
  {
    name: "Collections",
    href: "/collections",
    icon: FiDatabase,
  },
  {
    name: "Storage",
    href: "/storage",
    icon: FiHardDrive,
  },
  {
    name: "Users",
    href: "/users",
    icon: FiUsers,
  },
];

export const bottomNavigation: NavItem[] = [
  {
    name: "Settings",
    href: "/settings",
    icon: FiSettings,
  },
];
