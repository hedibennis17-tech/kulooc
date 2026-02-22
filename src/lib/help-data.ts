import {
  Car,
  Truck,
  Bike,
  Building2,
  Briefcase,
  User,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import sitemap from './help-sitemap.json';

export type HelpSection = {
  key: string;
  label: string;
  children: string[];
};

export type HelpHub = {
  name: string;
  slug: string;
  icon: LucideIcon;
  sections?: HelpSection[];
};

// The new sitemap doesn't provide icons. We'll map them by key.
const iconMap: { [key: string]: LucideIcon } = {
  riders: User,
  drivers: Car,
  eats: Utensils,
  marchands: Building2,
  bikes: Bike,
  business: Briefcase,
  freight: Truck,
};

export const helpSitemap = sitemap;

export const helpHubs: HelpHub[] = sitemap.hubs.map(hub => ({
  name: hub.label,
  slug: hub.key,
  icon: iconMap[hub.key] || User, // Default to User icon
  sections: hub.sections.map(s => ({
    key: s.key,
    label: s.label,
    children: s.children,
  })),
}));
