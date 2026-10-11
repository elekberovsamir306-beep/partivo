import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function base(paths: React.ReactNode, displayName: string) {
  function Icon({ size = 20, ...props }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
        {...props}
      >
        {paths}
      </svg>
    )
  }
  Icon.displayName = displayName
  return Icon
}

export const SearchIcon = base(<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>, 'SearchIcon')
export const HeartIcon = base(<path d="M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 10c0 5.65-7 10-7 10Z" />, 'HeartIcon')
export const BellIcon = base(<><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z" /><path d="M10 20a2 2 0 0 0 4 0" /></>, 'BellIcon')
export const UserIcon = base(<><circle cx="12" cy="8" r="4" /><path d="M4 20a8 8 0 0 1 16 0" /></>, 'UserIcon')
export const PlusIcon = base(<path d="M12 5v14M5 12h14" />, 'PlusIcon')
export const MenuIcon = base(<path d="M4 7h16M4 12h16M4 17h16" />, 'MenuIcon')
export const XIcon = base(<path d="M6 6l12 12M18 6 6 18" />, 'XIcon')
export const ChevronLeftIcon = base(<path d="m15 18-6-6 6-6" />, 'ChevronLeftIcon')
export const ChevronRightIcon = base(<path d="m9 18 6-6-6-6" />, 'ChevronRightIcon')
export const ChevronDownIcon = base(<path d="m6 9 6 6 6-6" />, 'ChevronDownIcon')
export const ArrowRightIcon = base(<path d="M5 12h14M13 6l6 6-6 6" />, 'ArrowRightIcon')
export const PhoneIcon = base(
  <path d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />,
  'PhoneIcon',
)
export const ChatIcon = base(
  <><path d="M4 20l1.4-4.2A8 8 0 1 1 8.2 18.6L4 20Z" /><path d="M9 10.5c.5 1.6 1.9 3 3.5 3.5l1-1 2 .8v1.2a1 1 0 0 1-1 1A6.5 6.5 0 0 1 8 9.5a1 1 0 0 1 1-1h1.2l.8 2-1 1" strokeWidth={1.4} /></>,
  'ChatIcon',
)
export const MapPinIcon = base(<><path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12Z" /><circle cx="12" cy="9" r="2.5" /></>, 'MapPinIcon')
export const EyeIcon = base(<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>, 'EyeIcon')
export const ShareIcon = base(<><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="m8.2 10.8 7.6-4.6M8.2 13.2l7.6 4.6" /></>, 'ShareIcon')
export const FlagIcon = base(<><path d="M5 21V4" /><path d="M5 4h11l-2 4 2 4H5" /></>, 'FlagIcon')
export const CheckIcon = base(<path d="m5 12 5 5 9-10" />, 'CheckIcon')
export const ShieldCheckIcon = base(<><path d="M12 3 5 6v5c0 4.5 3 8.5 7 10 4-1.5 7-5.5 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></>, 'ShieldCheckIcon')
export const TruckIcon = base(<><path d="M3 6h11v10H3zM14 9h4l3 3v4h-7" /><circle cx="7" cy="17.5" r="1.75" /><circle cx="17" cy="17.5" r="1.75" /></>, 'TruckIcon')
export const ClockIcon = base(<><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>, 'ClockIcon')
export const ImageIcon = base(<><rect x="3" y="4" width="18" height="16" rx="2.5" /><circle cx="9" cy="10" r="1.75" /><path d="m21 16-5-5-9 9" /></>, 'ImageIcon')
export const TrashIcon = base(<><path d="M4 7h16M10 11v6M14 11v6" /><path d="M6 7l1 13h10l1-13M9 7V4h6v3" /></>, 'TrashIcon')
export const EditIcon = base(<><path d="M4 20h4L19 9l-4-4L4 16v4Z" /><path d="m13.5 6.5 4 4" /></>, 'EditIcon')
export const UploadIcon = base(<><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></>, 'UploadIcon')
export const StarIcon = base(<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />, 'StarIcon')
export const SunIcon = base(<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>, 'SunIcon')
export const MoonIcon = base(<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />, 'MoonIcon')
export const FilterIcon = base(<path d="M4 5h16l-6 7.5V19l-4 1v-7.5L4 5Z" />, 'FilterIcon')
export const LogoutIcon = base(<><path d="M15 4h4v16h-4" /><path d="M10 8l-4 4 4 4M6 12h10" /></>, 'LogoutIcon')
export const SettingsIcon = base(<><circle cx="12" cy="12" r="3" /><path d="M12 2.5v3M12 18.5v3M4.2 6.5l2.6 1.5M17.2 16l2.6 1.5M4.2 17.5l2.6-1.5M17.2 8l2.6-1.5" /></>, 'SettingsIcon')
export const AlertIcon = base(<><path d="M12 3 2 20h20L12 3Z" /><path d="M12 10v4M12 17h.01" /></>, 'AlertIcon')
export const InfoIcon = base(<><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>, 'InfoIcon')
export const PackageIcon = base(<><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="m4 7.5 8 4.5 8-4.5M12 12v9" /></>, 'PackageIcon')
export const GridIcon = base(<><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></>, 'GridIcon')
export const ZoomIcon = base(<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5M11 8v6M8 11h6" /></>, 'ZoomIcon')
export const DragIcon = base(<><circle cx="9" cy="6" r="1" /><circle cx="15" cy="6" r="1" /><circle cx="9" cy="12" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="9" cy="18" r="1" /><circle cx="15" cy="18" r="1" /></>, 'DragIcon')
export const RefreshIcon = base(<><path d="M20 11a8 8 0 0 0-14.5-4.5L4 8" /><path d="M4 4v4h4M4 13a8 8 0 0 0 14.5 4.5L20 16" /><path d="M20 20v-4h-4" /></>, 'RefreshIcon')
export const PauseIcon = base(<path d="M9 5v14M15 5v14" />, 'PauseIcon')
export const PlayIcon = base(<path d="m7 5 12 7-12 7V5Z" />, 'PlayIcon')
export const TagIcon = base(<><path d="M3 12V4h8l10 10-8 8L3 12Z" /><circle cx="7.5" cy="8.5" r="1.5" /></>, 'TagIcon')
export const RocketIcon = base(<><path d="M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2" /><path d="M9 15l-3-3c1.5-5 6-9 13-9 0 7-4 11.5-9 13l-1-1Z" /><circle cx="15" cy="9" r="1.5" /></>, 'RocketIcon')
export const StoreIcon = base(<><path d="M4 9.5 5.5 4h13L20 9.5" /><path d="M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0" /><path d="M5 11.5V20h14v-8.5M10 20v-5h4v5" /></>, 'StoreIcon')
export const DownloadIcon = base(<><path d="M12 4v12M7 11l5 5 5-5" /><path d="M4 18v2h16v-2" /></>, 'DownloadIcon')
export const CopyIcon = base(<><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" /></>, 'CopyIcon')

// Category glyphs --------------------------------------------------------------
export const EngineIcon = base(<><path d="M4 10h2V8h4V6h4v2h3l2 2h2v6h-2l-2 2H8l-2-2H4v-6Z" /><path d="M1.5 11v4M10 12h4" /></>, 'EngineIcon')
export const GearboxIcon = base(<><circle cx="6" cy="6" r="2" /><circle cx="12" cy="6" r="2" /><circle cx="18" cy="6" r="2" /><circle cx="6" cy="18" r="2" /><circle cx="12" cy="18" r="2" /><path d="M6 8v10M12 8v10M18 8v4H6" /></>, 'GearboxIcon')
export const SuspensionIcon = base(<><path d="M12 2v3M12 19v3M8 5h8M8 19h8" /><path d="M9 7l6 2-6 2 6 2-6 2 6 2" /></>, 'SuspensionIcon')
export const BrakeIcon = base(<><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="2.5" /><path d="M5.5 6.5A8.5 8.5 0 0 1 12 3.5" strokeWidth={4} opacity={0.5} /></>, 'BrakeIcon')
export const CarBodyIcon = base(<><path d="M3 15v-3l2-4.5A2 2 0 0 1 6.8 6h10.4a2 2 0 0 1 1.8 1.5L21 12v3a1 1 0 0 1-1 1h-1" /><path d="M5 16H4a1 1 0 0 1-1-1M3 12h18" /><circle cx="7.5" cy="16.5" r="2" /><circle cx="16.5" cy="16.5" r="2" /><path d="M9.5 16.5h5" /></>, 'CarBodyIcon')
export const LightIcon = base(<><path d="M12 6c-4 0-6 2.5-6 6s2 6 6 6h2V6h-2Z" /><path d="M17 8h4M17 12h4M17 16h4" /></>, 'LightIcon')
export const BatteryIcon = base(<><rect x="3" y="7" width="18" height="12" rx="2" /><path d="M7 7V5h3v2M14 7V5h3v2M7 13h3M15.5 11.5v3M14 13h3" /></>, 'BatteryIcon')
export const CoolingIcon = base(<><path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9" /><path d="m9.5 4.5 2.5 2 2.5-2M9.5 19.5l2.5-2 2.5 2" /></>, 'CoolingIcon')
export const FuelIcon = base(<><path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M4 21h12M8 8h4" /><path d="M15 10h2a2 2 0 0 1 2 2v4a1.5 1.5 0 0 0 3 0V8l-3-3" /></>, 'FuelIcon')
export const FilterPartIcon = base(<><ellipse cx="12" cy="5.5" rx="7" ry="2.5" /><path d="M5 5.5v13c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-13" /><path d="M8 9v9M12 9.5v9.5M16 9v9" /></>, 'FilterPartIcon')
export const WheelIcon = base(<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" /><path d="M12 3v6M12 15v6M3 12h6M15 12h6" /></>, 'WheelIcon')
export const SeatIcon = base(<><path d="M7 3h4l1 9H8L7 3Z" /><path d="M6 13h9l2 4H7l-1-4ZM8 17v4M15 17v4" /></>, 'SeatIcon')
export const AccessoryIcon = base(<><rect x="4" y="5" width="16" height="11" rx="2" /><path d="M9 20h6M12 16v4M8 9h8M8 12h5" /></>, 'AccessoryIcon')

const CATEGORY_ICONS: Record<string, ReturnType<typeof base>> = {
  engine: EngineIcon,
  gearbox: GearboxIcon,
  suspension: SuspensionIcon,
  brake: BrakeIcon,
  body: CarBodyIcon,
  light: LightIcon,
  battery: BatteryIcon,
  cooling: CoolingIcon,
  fuel: FuelIcon,
  filter: FilterPartIcon,
  wheel: WheelIcon,
  seat: SeatIcon,
  accessory: AccessoryIcon,
}

export function CategoryIcon({ icon, ...props }: IconProps & { icon: string | null }) {
  const Icon = (icon && CATEGORY_ICONS[icon]) || PackageIcon
  return <Icon {...props} />
}
