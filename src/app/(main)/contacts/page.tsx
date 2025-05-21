
"use client";

import { Users, UserPlus, Search, Loader2, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomAvatar } from "@/components/common/CustomAvatar";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, addDoc, serverTimestamp, getDoc, DocumentData, QuerySnapshot, writeBatch } from "firebase/firestore";
import type { User, Chat } from "@/lib/types";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { GEMINI_BOT_UID } from "@/lib/constants";

export default function ContactsPage() {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [contacts, setContacts] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [actionStates, setActionStates] = useState<{ [userId: string]: { loading: boolean } }>({});
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!currentUser) {
      setLoadingUsers(false);
      return;
    }

    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const usersCollectionRef = collection(db, "users");
        // Fetch all users including the bot, but exclude the current user
        const q = query(usersCollectionRef, where("uid", "!=", currentUser.uid));
        const querySnapshot = await getDocs(q);
        const usersList: User[] = [];
        querySnapshot.forEach((doc) => {
          usersList.push({ id: doc.id, ...doc.data() } as User);
        });
        setContacts(usersList);
      } catch (error) {
        console.error("Error fetching users:", error);
        toast({ title: "Error", description: "Could not fetch contacts.", variant: "destructive" });
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [currentUser, toast]);

  const handleMessageUser = async (targetUser: User) => {
    if (!currentUser || !targetUser.uid) return;

    setActionStates(prev => ({ ...prev, [targetUser.uid]: { loading: true } }));

    try {
      const chatsRef = collection(db, "chats");
      const q1 = query(chatsRef,
        where("isGroup", "==", false),
        where("participants", "array-contains", currentUser.uid)
      );

      const querySnapshot = await getDocs(q1);
      let existingChat: (Chat & { id: string }) | null = null;

      querySnapshot.forEach((doc) => {
        const chat = doc.data() as Chat;
        if (chat.participants.includes(targetUser.uid) && chat.participants.length === 2) {
          existingChat = { ...chat, id: doc.id };
        }
      });

      if (existingChat) {
        // If chat exists and it's with the bot, ensure status is accepted.
        if (targetUser.uid === GEMINI_BOT_UID && existingChat.status !== 'accepted') {
          const batch = writeBatch(db);
          batch.update(doc.ref(existingChat.id), { status: 'accepted', updatedAt: serverTimestamp() });
          await batch.commit();
        }
        router.push(`/chat/${existingChat.id}`);
      } else {
        const isBotChat = targetUser.uid === GEMINI_BOT_UID;
        const newChatRef = await addDoc(chatsRef, {
          participants: [currentUser.uid, targetUser.uid].sort(),
          participantDetails: {
            [currentUser.uid]: {
              displayName: currentUser.displayName || currentUser.email,
              photoURL: currentUser.photoURL || null,
            },
            [targetUser.uid]: {
              displayName: targetUser.displayName || targetUser.email,
              photoURL: targetUser.photoURL || null,
            }
          },
          isGroup: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastMessage: null,
          status: isBotChat ? 'accepted' : 'pending', // Directly accept bot chats
          initiatedBy: isBotChat ? null : currentUser.uid, // No initiator needed if accepted
        });
        if (!isBotChat) {
            toast({
                title: "Chat Request Initiated",
                description: `Send your first message to ${targetUser.displayName || 'this user'} to complete the request.`,
            });
        }
        router.push(`/chat/${newChatRef.id}`);
      }
    } catch (error) {
      console.error("Error starting chat:", error);
      toast({ title: "Error", description: "Could not start chat.", variant: "destructive" });
    } finally {
      setActionStates(prev => ({ ...prev, [targetUser.uid]: { loading: false } }));
    }
  };

  const filteredContacts = contacts.filter(contact =>
    contact.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full p-4 sm:p-6 md:p-8 bg-background">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl sm:text-3xl font-semibold text-foreground flex items-center gap-2">
          <Users className="h-7 w-7 text-primary" />
          Your Contacts
        </h1>
        <Button disabled> {/* TODO: Implement Invite Contact functionality */}
          <UserPlus className="mr-2 h-5 w-5" />
          Invite Contact
        </Button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search contacts by name or email..."
            className="pl-10 w-full max-w-md"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loadingUsers ? (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : filteredContacts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {filteredContacts.map((contact) => (
            <Card key={contact.uid} className="shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="flex flex-row items-center gap-4 p-4">
                <CustomAvatar
                  src={contact.photoURL}
                  alt={contact.displayName || contact.email || "User"}
                  className="h-12 w-12"
                  data-ai-hint={contact.dataAiHint || (contact.isBot ? "robot bot" : "person avatar")}
                />
                <div>
                  <CardTitle className="text-lg">{contact.displayName || "Unnamed User"}</CardTitle>
                  <p className="text-sm text-muted-foreground">{contact.email}</p>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleMessageUser(contact)}
                  disabled={actionStates[contact.uid]?.loading}
                >
                  {actionStates[contact.uid]?.loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : <MessageSquareText className="mr-2 h-4 w-4" /> }
                  Message
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center py-10 border-2 border-dashed rounded-lg">
          <Users className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-medium text-foreground mb-1">No other users found</h2>
          <p className="text-muted-foreground mb-4">Looks like it's just you here for now. Invite others to join!</p>
        </div>
      )}
    </div>
  );
}
