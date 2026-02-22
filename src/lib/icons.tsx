import { Zap } from 'lucide-react';

export const CarMarkerIcon = ({ isElectric, isSelected }: { isElectric: boolean; isSelected?: boolean; }) => {
    const primaryColor = isSelected ? 'hsl(var(--primary-foreground))' : 'hsl(var(--primary))';
    const bgColor = isSelected ? 'hsl(var(--primary))' : 'hsl(var(--background))';

    return (
        <div className={`transition-transform duration-200 ${isSelected ? 'scale-125' : 'scale-100'}`}>
            <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md border-2 transition-colors`}
                style={{ backgroundColor: bgColor, borderColor: primaryColor }}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={primaryColor}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M19 17h2a1 1 0 0 0 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h2" />
                    <circle cx="7" cy="17" r="2" />
                    <circle cx="17" cy="17" r="2" />
                </svg>

                {isElectric && (
                    <Zap className="absolute -top-1 -right-1 h-4 w-4 text-yellow-400 fill-yellow-400" />
                )}
            </div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-2">
                <div 
                    className="w-3 h-3 bg-primary/20 rounded-full"
                    style={{ backgroundColor: 'rgba(216, 6, 33, 0.2)' }}
                />
            </div>
        </div>
    );
};

// A simple car icon component for the services
export const SimpleCarIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M14 16.5V14a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2.5" />
    <path d="M14 16.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />
    <path d="M6 16.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />
    <path d="M5 11.5V9a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2.5" />
    <path d="M12 12V7" />
    <path d="M5 9l-2.5 2.5" />
    <path d="M19 9l2.5 2.5" />
  </svg>
);

export const ElectricCarIcon = ({ className }: { className?: string }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M14 16.5V14a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2.5" />
      <path d="M14 16.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />
      <path d="M6 16.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />
      <path d="M5 11.5V9a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2.5" />
      <path d="m11 12-2 3h4l-2 3" />
      <path d="M5 9l-2.5 2.5" />
      <path d="M19 9l2.5 2.5" />
    </svg>
);


export const ComfortCarIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M14 16.5V14a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2.5" />
    <path d="M14 16.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />
    <path d="M6 16.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />
    <path d="M5 11.5V9a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2.5" />
    <path d="M12 12V7" />
    <path d="M5 9l-2.5 2.5" />
    <path d="M19 9l2.5 2.5" />
    <path d="m16.5 10-1.15 1.15a1 1 0 0 1-1.41 0l-1.15-1.15" />
  </svg>
);

export const PackageIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M16.5 9.4a.5.5 0 0 0-.5-.4h-1" />
    <path d="m10.5 16.5 1.5-1.5-1.5-1.5" />
    <path d="M2 12h1.5a.5.5 0 0 0 .5-.5V8.5a.5.5 0 0 1 .5-.5h1.5" />
    <path d="M21 12h-1.5a.5.5 0 0 1-.5-.5V8.5a.5.5 0 0 0-.5-.5h-1.5" />
    <path d="M6.3 11.9 4.4 14" />
    <path d="M17.7 11.9 19.6 14" />
    <path d="M22 12c0 2.8-2.2 5-5 5h-1.5a.5.5 0 0 1-.5-.5v-1.5a.5.5 0 0 0-.5-.5H9.5a.5.5 0 0 0-.5.5V16a.5.5 0 0 1-.5.5H7c-2.8 0-5-2.2-5-5" />
    <path d="M12 5.5a.5.5 0 0 0-.5-.5H10" />
    <path d="M18 12h.5a.5.5 0 0 0 .5-.5V8.5a.5.5 0 0 1 .5-.5H21" />
    <path d="m3.5 9 .5 1" />
    <path d="m20.5 9-.5 1" />
    <path d="M12 2a4 4 0 0 0-4 4v5h8V6a4 4 0 0 0-4-4Z" />
  </svg>
);

export const XLCarIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M18 17h2a1 1 0 0 0 1-1v-4a1 1 0 0 0-1-1h-3" />
    <path d="m2 12 1.4-1.4a1 1 0 0 1 1.4 0L6 12" />
    <path d="M14 17H6a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v1" />
    <circle cx="7" cy="17" r="2" />
    <circle cx="17" cy="17" r="2" />
  </svg>
);

export const PremiumCarIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M20.3,13.2a2.5,2.5,0,0,0-3.6,3.6L12,22,7.3,16.8a2.5,2.5,0,0,0-3.6-3.6L2,15V11a2,2,0,0,1,2-2H20a2,2,0,0,1,2,2v2Z" />
    <path d="M8,9H4a1,1,0,0,0-1,1V17" />
    <path d="M16,9h4a1,1,0,0,1,1,1V17" />
    <circle cx="8" cy="17" r="2" />
    <circle cx="16" cy="17" r="2" />
  </svg>
);

export const DeluxeCarIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M19.1,13.8a2,2,0,0,0-2.2,3.4l-4,3.8-4-3.8A2,2,0,0,0,4.9,13.8,5,5,0,0,1,2,9V6A2,2,0,0,1,4,4H20a2,2,0,0,1,2,2V9a5,5,0,0,1-2.9,4.8Z" />
    <circle cx="8" cy="17" r="2" />
    <circle cx="16" cy="17" r="2" />
  </svg>
);

export const MapleLeafIcon = ({ className }: { className?: string }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
        <path d="M21.2,8.8c-0.2-0.8-0.8-1.4-1.6-1.6C18.8,7,18,6.2,17.2,5.5c-0.9-0.8-2-1.2-3.1-1.2h-4c-1.2,0-2.2,0.4-3.1,1.2C6.2,6.2,5.4,7,4.6,7.2C3.8,7.4,3.2,8,3,8.8c-0.2,0.8,0,1.6,0.5,2.3c0.5,0.7,0.8,1.6,0.8,2.5c0,1-0.3,1.9-0.8,2.7c-0.5,0.8-0.7,1.6-0.5,2.4c0.2,0.8,0.8,1.4,1.6,1.6c0.8,0.2,1.6,0.8,2.3,1.5c0.9,0.8,2,1.2,3.1,1.2h4c1.2,0,2.2-0.4,3.1-1.2c0.8-0.8,1.6-1.4,2.3-1.5c0.8-0.2,1.4-0.8,1.6-1.6c0.2-0.8,0-1.6-0.5-2.4c-0.5-0.7-0.8-1.6-0.8-2.7c0-0.8,0.3-1.7,0.8-2.5C21.2,10.4,21.4,9.6,21.2,8.8z M12,19.5c-2.1,0-4-0.8-5.3-2.3l0.8-0.8c1.1,1.1,2.6,1.8,4.5,1.8s3.4-0.6,4.5-1.8l0.8,0.8C16,18.7,14.1,19.5,12,19.5z M12.8,14.8V18h-1.5v-3.2c0-1.2-0.4-2.3-1.2-3.1L5.5,7.1L6.6,6l4.6,4.6c0.2,0.2,0.4,0.4,0.6,0.6v-4h1.5v4c0.2-0.2,0.4-0.4,0.6-0.6l4.6-4.6l1.1,1.1l-4.6,4.6C13.2,12.5,12.8,13.6,12.8,14.8z"/>
    </svg>
);
