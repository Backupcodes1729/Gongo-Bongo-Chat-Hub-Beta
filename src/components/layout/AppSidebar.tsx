
"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CustomAvatar } from "@/components/common/CustomAvatar";
import { PlusCircle, Search, MessageSquare, Users, Settings, Loader2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, Timestamp } from "firebase/firestore";
import type { Chat, User as AppUser } from "@/lib/types";

interface SidebarChatItem {
  id: string; // Chat ID
  displayName: string;
  displayAvatar: string | null;
  lastMessageText: string;
  lastMessageTimestamp?: Timestamp | Date | any;
  isActive: boolean;
  dataAiHint?: string;
}

interface SidebarNavLinkProps {
  href: string;
  children: React.ReactNode;
  icon: React.ElementType;
}

function SidebarNavLink({ href, children, icon: Icon }: SidebarNavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || (href === "/chat" && pathname.startsWith("/chat/"));

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        isActive && "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 hover:text-sidebar-primary-foreground"
      )}
    >
      <Icon className="h-5 w-5" />
      {children}
    </Link>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const { user: currentUser } = useAuth();
  const [sidebarChats, setSidebarChats] = useState<SidebarChatItem[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const chatItemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});

  useEffect(() => {
    if (!currentUser) {
      setLoadingChats(false);
      setSidebarChats([]);
      return;
    }

    setLoadingChats(true);
    const chatsRef = collection(db, "chats");
    const q = query(
      chatsRef,
      where("participants", "array-contains", currentUser.uid),
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      const fetchedChats: SidebarChatItem[] = [];
      const otherParticipantIds: string[] = [];
      const chatDocs = querySnapshot.docs;

      chatDocs.forEach(chatDoc => {
        const chatData = chatDoc.data() as Chat;
        if (!chatData.isGroup) {
          const otherId = chatData.participants.find(pId => pId !== currentUser.uid);
          if (otherId && !otherParticipantIds.includes(otherId)) {
            otherParticipantIds.push(otherId);
          }
        }
      });
      
      const usersDataMap = new Map<string, AppUser>();
      if (otherParticipantIds.length > 0) {
        // Batch fetch user documents for efficiency if many chats
        const userDocsPromises = otherParticipantIds.map(id => getDoc(doc(db, "users", id)));
        const userDocsSnapshots = await Promise.all(userDocsPromises);
        userDocsSnapshots.forEach(userDocSnap => {
          if (userDocSnap.exists()) {
            usersDataMap.set(userDocSnap.id, userDocSnap.data() as AppUser);
          }
        });
      }

      for (const chatDoc of chatDocs) {
        const chatData = chatDoc.data() as Chat;
        chatData.id = chatDoc.id; 

        let displayName = "Chat";
        let displayAvatar: string | null = null;
        let dataAiHint: string = "person avatar"; 

        if (chatData.isGroup) {
          displayName = chatData.groupName || "Group Chat";
          displayAvatar = chatData.groupAvatar || null;
          dataAiHint = "group avatar";
        } else {
          const otherParticipantId = chatData.participants.find(pId => pId !== currentUser.uid);
          if (otherParticipantId) {
            const otherParticipantUser = usersDataMap.get(otherParticipantId);
            if (otherParticipantUser) {
              displayName = otherParticipantUser.displayName || "User";
              displayAvatar = otherParticipantUser.photoURL || null;
              dataAiHint = otherParticipantUser.dataAiHint || "person avatar";
            } else {
              displayName = "Loading User..."; 
            }
          }
        }
        
        let lastMessageText = chatData.lastMessage?.text || "No messages yet";
        if (lastMessageText.length > 30) {
            lastMessageText = lastMessageText.substring(0, 27) + "...";
        }

        fetchedChats.push({
          id: chatData.id,
          displayName,
          displayAvatar,
          lastMessageText: lastMessageText,
          lastMessageTimestamp: chatData.lastMessage?.timestamp || chatData.updatedAt,
          isActive: pathname === `/chat/${chatData.id}`,
          dataAiHint,
        });
      }
      
      fetchedChats.sort((a, b) => {
        const timeA = a.lastMessageTimestamp?.seconds || 0;
        const timeB = b.lastMessageTimestamp?.seconds || 0;
        return timeB - timeA;
      });

      setSidebarChats(fetchedChats);
      setLoadingChats(false);
    }, (error) => {
      console.error("Error fetching chats:", error);
      setLoadingChats(false);
    });

    return () => unsubscribe();
  }, [currentUser, pathname]);


  useEffect(() => {
    const activeChat = sidebarChats.find(chat => chat.isActive);
    if (activeChat && chatItemRefs.current[activeChat.id]) {
      chatItemRefs.current[activeChat.id]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [pathname, sidebarChats]); // Rerun when active chat changes or chat list updates

  return (
    <aside className="hidden md:flex flex-col w-72 border-r bg-sidebar text-sidebar-foreground">
      <div className="p-4 space-y-2">
        <h2 className="text-xl font-semibold text-sidebar-foreground">Chats</h2>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input type="search" placeholder="Search chats..." className="pl-8 w-full bg-background focus:bg-background/90" />
        </div>
      </div>

      <ScrollArea className="flex-1 px-2">
        <nav className="grid items-start gap-1">
          <SidebarNavLink href="/chat" icon={MessageSquare}>
            All Chats
          </SidebarNavLink>
          <SidebarNavLink href="/contacts" icon={Users}>
            Contacts
          </SidebarNavLink>
        </nav>

        <div className="mt-4 px-1">
          <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground tracking-wider">Your Chats</h3>
          {loadingChats ? (
            <div className="flex justify-center items-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : sidebarChats.length === 0 && currentUser ? (
            <p className="p-2 text-sm text-muted-foreground">No chats yet. Start a new conversation!</p>
          ) : !currentUser && !loadingChats ? (
             <p className="p-2 text-sm text-muted-foreground">Login to see your chats.</p>
          ) : (
            sidebarChats.map((chat) => (
              <Link
                href={`/chat/${chat.id}`}
                key={chat.id}
                ref={(el: HTMLAnchorElement | null) => (chatItemRefs.current[chat.id] = el)}
                className={cn(
                  "flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  chat.isActive && "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                )}
              >
                <CustomAvatar 
                  src={chat.displayAvatar} 
                  alt={chat.displayName} 
                  className="h-9 w-9" 
                  fallback={chat.displayName?.charAt(0) || "?"}
                  data-ai-hint={chat.dataAiHint}
                />
                <div className="flex-1 truncate">
                  <p className="font-medium text-sm truncate">{chat.displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">{chat.lastMessageText}</p>
                </div>
              </Link>
            ))
          )}
        </div>
        <div className="mt-6 px-1">
          <Button variant="outline" className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
            <PlusCircle className="h-5 w-5" />
            Invite Contacts
          </Button>
        </div>
      </ScrollArea>
      
      <div className="mt-auto p-4 border-t border-sidebar-border">
        <SidebarNavLink href="/settings" icon={Settings}>
          Settings
        </SidebarNavLink>
      </div>
    </aside>
  );
}

