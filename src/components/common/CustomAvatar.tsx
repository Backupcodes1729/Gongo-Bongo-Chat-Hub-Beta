
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User as UserIcon } from "lucide-react";

interface CustomAvatarProps {
  src?: string | null;
  alt?: string;
  fallback?: string | React.ReactNode;
  className?: string;
  "data-ai-hint"?: string; // Explicitly define data-ai-hint
}

export function CustomAvatar({ src, alt = "User Avatar", fallback, className, "data-ai-hint": dataAiHint }: CustomAvatarProps) {
  const getInitials = (name?: string) => {
    if (!name) return <UserIcon className="h-1/2 w-1/2" />;
    const names = name.split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return names[0].charAt(0).toUpperCase() + names[names.length - 1].charAt(0).toUpperCase();
  };
  
  return (
    <Avatar className={className} data-ai-hint={dataAiHint}>
      {src && <AvatarImage src={src} alt={alt} />}
      <AvatarFallback>
        {fallback || getInitials(alt)}
      </AvatarFallback>
    </Avatar>
  );
}
