
"use client";

import { Inbox, Loader2, UserCircle, MessageSquareText, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomAvatar } from "@/components/common/CustomAvatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, Timestamp } from "firebase/firestore";
import type { Chat, User as AppUser } from "@/lib/types";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

interface ChatRequestItem {
  id: string; // Chat ID
  initiatorId: string;
  initiatorDisplayName: string;
  initiatorAvatar: string | null;
  lastMessageSnippet?: string; // Optional: Could be the first message of the request
  timestamp?: Timestamp;
  dataAiHint?: string;
}

export default function RequestsPage() {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [requests, setRequests] = useState<ChatRequestItem[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  useEffect(() => {
    console.log("RequestsPage: mounted or currentUser changed.");
    if (!currentUser) {
      setLoadingRequests(false);
      setRequests([]);
      console.log("RequestsPage: No current user, clearing requests.");
      return;
    }
    setLoadingRequests(true);
    console.log("RequestsPage: Fetching requests for user:", currentUser.uid);

    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", currentUser.uid),
      where("status", "==", "pending"),
      where("initiatedBy", "!=", currentUser.uid), // Only incoming requests
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      console.log("RequestsPage: Snapshot received, docs count:", querySnapshot.docs.length);
      if (querySnapshot.empty) {
        setRequests([]);
        setLoadingRequests(false);
        console.log("RequestsPage: Snapshot empty, no requests found.");
        return;
      }

      const requestsList: ChatRequestItem[] = [];
      const usersData = new Map<string, AppUser>();
      const participantIdsToFetch: string[] = [];

      querySnapshot.forEach((doc) => {
        const chatData = { id: doc.id, ...doc.data() } as Chat;
        const initiatorId = chatData.initiatedBy;
        if (initiatorId && initiatorId !== currentUser.uid) {
          if (!usersData.has(initiatorId) && !participantIdsToFetch.includes(initiatorId)) {
            participantIdsToFetch.push(initiatorId);
          }
        }
      });
      
      console.log("RequestsPage: Participant IDs to fetch:", participantIdsToFetch);

      if (participantIdsToFetch.length > 0) {
        const userDocsPromises = participantIdsToFetch.map(id => getDoc(doc(db, "users", id)));
        try {
          const userDocsSnapshots = await Promise.all(userDocsPromises);
          userDocsSnapshots.forEach(userDocSnap => {
            if (userDocSnap.exists()) {
              usersData.set(userDocSnap.id, userDocSnap.data() as AppUser);
            }
          });
          console.log("RequestsPage: Fetched usersData:", usersData);
        } catch (error) {
          console.error("RequestsPage: Error fetching user details for requests:", error);
          toast({ title: "Error", description: "Could not fetch full request details.", variant: "destructive"});
          // Continue processing with available data if possible, or handle error state
        }
      }

      querySnapshot.forEach((docSnap) => {
        const chatData = { id: docSnap.id, ...docSnap.data() } as Chat;
        const initiatorId = chatData.initiatedBy;

        if (initiatorId && initiatorId !== currentUser.uid) {
          const initiator = usersData.get(initiatorId);
          requestsList.push({
            id: chatData.id,
            initiatorId: initiatorId,
            initiatorDisplayName: initiator?.displayName || "User",
            initiatorAvatar: initiator?.photoURL || null,
            lastMessageSnippet: chatData.lastMessage?.text?.substring(0, 30) + (chatData.lastMessage?.text && chatData.lastMessage.text.length > 30 ? "..." : "") || "New chat request",
            timestamp: chatData.updatedAt as Timestamp,
            dataAiHint: initiator?.dataAiHint || (initiator?.isBot ? "robot bot" : "person avatar"),
          });
        }
      });
      
      console.log("RequestsPage: Processed requests list:", requestsList);
      setRequests(requestsList);
      setLoadingRequests(false);
    }, (error) => {
      console.error("RequestsPage: Error fetching chat requests:", error);
      toast({ title: "Error", description: "Could not fetch chat requests.", variant: "destructive" });
      setLoadingRequests(false);
    });

    return () => {
      console.log("RequestsPage: Unsubscribing from requests snapshot.");
      unsubscribe();
    };
  }, [currentUser, toast]);

  if (loadingRequests) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-2 text-muted-foreground">Loading requests...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
        <div className="flex flex-col h-full items-center justify-center p-4 text-center">
            <UserCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Please Login</h2>
            <p className="text-muted-foreground mb-4">You need to be logged in to see your chat requests.</p>
            <Button onClick={() => router.push('/login')}>Go to Login</Button>
        </div>
    );
  }
  
  console.log("RequestsPage: Rendering. Loading:", loadingRequests, "Requests count:", requests.length);

  if (requests.length === 0) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-center p-6 bg-background">
        <Inbox className="w-24 h-24 text-primary mb-6 opacity-50" />
        <h1 className="text-3xl font-semibold text-foreground mb-2">No Pending Requests</h1>
        <p className="text-lg text-muted-foreground max-w-md">
          You have no new chat requests at the moment.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 sm:p-6 md:p-8 bg-background">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl sm:text-3xl font-semibold text-foreground flex items-center gap-2">
          <Inbox className="h-7 w-7 text-primary" />
          Chat Requests
        </h1>
      </div>
      <ScrollArea className="flex-1 -mx-4 sm:-mx-6 md:-mx-8">
        <div className="divide-y divide-border">
          {requests.map((request) => (
            <Link href={`/chat/${request.id}`} key={request.id} className="block hover:bg-muted/50 transition-colors">
              <Card className="rounded-none shadow-none border-x-0 border-t-0 first:border-t">
                <CardHeader className="flex flex-row items-center gap-4 p-4">
                  <CustomAvatar
                    src={request.initiatorAvatar}
                    alt={request.initiatorDisplayName}
                    className="h-12 w-12"
                    data-ai-hint={request.dataAiHint}
                    fallback={request.initiatorDisplayName.charAt(0) || "U"}
                  />
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{request.initiatorDisplayName}</CardTitle>
                    <p className="text-sm text-muted-foreground truncate">
                      {request.lastMessageSnippet || "Wants to connect with you."}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    {/* The Link component makes the whole card clickable, so this button is more for visual cue */}
                    <span>View</span> 
                  </Button>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
