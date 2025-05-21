import { MessageSquareText } from "lucide-react";

export default function ChatPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-background">
      <MessageSquareText className="w-24 h-24 text-primary mb-6 opacity-50" />
      <h1 className="text-3xl font-semibold text-foreground mb-2">Welcome to Gongo Bongo Chat!</h1>
      <p className="text-lg text-muted-foreground max-w-md">
        Select a chat from the sidebar to start messaging, or invite your contacts to connect.
      </p>
      {/* Placeholder for "Invite Contacts" button or quick actions */}
    </div>
  );
}
