
"use client";

import { CustomAvatar } from "@/components/common/CustomAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Paperclip, SendHorizonal, Smile, Mic, Phone, Video, Info, Loader2, Check, MessageSquareReply, X } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import React, { useState, useEffect, useRef, FormEvent } from "react";
import { db, auth, rtdb, databaseRef } from "@/lib/firebase"; 
import { onValue, off } from "firebase/database";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  updateDoc,
  arrayUnion,
  Unsubscribe
} from "firebase/firestore";
import type { User, ChatMessage, Chat } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils";
import { suggestReply, type SuggestReplyInput, type SuggestReplyOutput } from "@/ai/flows/suggest-reply";

const NOTIFICATION_SETTINGS_KEY = 'gongoBongoNotificationSettings';

const formatMessageTimestamp = (timestamp: Timestamp | Date | undefined): string => {
  if (!timestamp) return "";
  const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

interface RtdbUserStatus {
  isOnline: boolean;
  lastSeen: number;
  displayName?: string;
}

export default function IndividualChatPage() {
  const params = useParams();
  const router = useRouter();
  const chatId = params.chatId as string;
  const { user: currentUser } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatDetails, setChatDetails] = useState<Chat | null>(null);
  const [chatPartner, setChatPartner] = useState<User | null>(null);
  const [rtdbPartnerStatus, setRtdbPartnerStatus] = useState<RtdbUserStatus | null>(null);
  const [loadingChat, setLoadingChat] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [replyingToMessage, setReplyingToMessage] = useState<ChatMessage | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [loadingAiSuggestions, setLoadingAiSuggestions] = useState(false);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousMessagesRef = useRef<ChatMessage[]>([]);


  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView(); // Instant scroll to the bottom
    }
  }, [messages]);

  useEffect(() => {
    if (!chatId || !currentUser?.uid) {
        if (!currentUser?.uid && chatId) { 
            setLoadingChat(false);
        }
        return;
    }
    setLoadingChat(true);
    const chatDocRef = doc(db, "chats", chatId);
    let unsubscribePartnerFirestore: Unsubscribe | null = null; 

    const unsubscribeChatDetails = onSnapshot(chatDocRef, async (docSnap) => {
      if (docSnap.exists()) {
        const chatData = { id: docSnap.id, ...docSnap.data() } as Chat;
        setChatDetails(chatData);

        if (!chatData.isGroup && chatData.participants && currentUser?.uid) {
          const partnerId = chatData.participants.find(pId => pId !== currentUser.uid);
          if (partnerId) {
            const userDocRef = doc(db, "users", partnerId);
             // Clean up previous listener if it exists and points to a different partner
            if (unsubscribePartnerFirestore) {
                unsubscribePartnerFirestore();
                unsubscribePartnerFirestore = null;
            }
            unsubscribePartnerFirestore = onSnapshot(userDocRef, (userSnap) => {
              if (userSnap.exists()) {
                setChatPartner(userSnap.data() as User);
              } else {
                setChatPartner(null);
              }
            });
          } else { // No partnerId found (e.g. chat with self, or inconsistent data)
             if (unsubscribePartnerFirestore) {
                unsubscribePartnerFirestore();
                unsubscribePartnerFirestore = null;
            }
            setChatPartner(null);
          }
        } else if (chatData.isGroup) {
           if (unsubscribePartnerFirestore) {
                unsubscribePartnerFirestore();
                unsubscribePartnerFirestore = null;
            }
          setChatPartner(null); 
        }
      } else {
        setChatDetails(null);
        setChatPartner(null);
        if (unsubscribePartnerFirestore) {
            unsubscribePartnerFirestore();
            unsubscribePartnerFirestore = null;
        }
      }
      setLoadingChat(false);
    }, (error) => {
      console.error("Error fetching chat details (Firestore):", error);
      setChatDetails(null);
      setChatPartner(null);
      if (unsubscribePartnerFirestore) {
        unsubscribePartnerFirestore();
        unsubscribePartnerFirestore = null;
      }
      setLoadingChat(false);
    });

    return () => {
      unsubscribeChatDetails();
      if (unsubscribePartnerFirestore) {
        unsubscribePartnerFirestore();
      }
    };
  }, [chatId, currentUser?.uid]);

  useEffect(() => {
    if (!chatDetails || chatDetails.isGroup || !currentUser?.uid) {
      setRtdbPartnerStatus(null);
      return;
    }
    
    const partnerId = chatDetails.participants.find(pId => pId !== currentUser.uid);
    if (!partnerId) {
      setRtdbPartnerStatus(null);
      return;
    }

    const partnerStatusRtdbRef = databaseRef(rtdb, `/status/${partnerId}`);
    const listener = onValue(partnerStatusRtdbRef, (snapshot) => {
      if (snapshot.exists()) {
        setRtdbPartnerStatus(snapshot.val() as RtdbUserStatus);
      } else {
        setRtdbPartnerStatus(null);
      }
    }, (error) => {
      console.error("Error fetching RTDB partner status:", error);
      setRtdbPartnerStatus(null);
    });
    return () => off(partnerStatusRtdbRef, 'value', listener);
  }, [chatDetails, currentUser?.uid]);


  const fetchAiSuggestions = async (messageText: string) => {
    if (!messageText.trim() || !currentUser) return;
    setLoadingAiSuggestions(true);
    setAiSuggestions([]);
    try {
      const response = await suggestReply({ message: messageText });
      setAiSuggestions(response.suggestions);
    } catch (error) {
      console.error("Error fetching AI suggestions:", error);
      setAiSuggestions([]);
    } finally {
      setLoadingAiSuggestions(false);
    }
  };

  useEffect(() => {
    if (!chatId || !currentUser?.uid) return;
    const messagesColRef = collection(db, "chats", chatId, "messages");
    const q = query(messagesColRef, orderBy("timestamp", "asc"));

    const unsubscribeMessages = onSnapshot(q, (querySnapshot) => {
      const fetchedMessages: ChatMessage[] = [];
      querySnapshot.forEach((doc) => {
        fetchedMessages.push({ id: doc.id, ...doc.data() } as ChatMessage);
      });
      setMessages(fetchedMessages);
    }, (error) => {
      console.error("Error fetching messages:", error);
    });
    return () => unsubscribeMessages();
  }, [chatId, currentUser?.uid]); 

  // Effect for handling notifications for new messages
  useEffect(() => {
    if (!currentUser || !messages.length || !chatDetails) {
      previousMessagesRef.current = [...messages]; // Keep ref updated even if no notification
      return;
    }

    const lastMessage = messages[messages.length - 1];
    const isInitialLoad = previousMessagesRef.current.length === 0 && messages.length > 0;
    
    const isNewMessageFromPartner = 
      lastMessage.senderId !== currentUser.uid &&
      (!previousMessagesRef.current.find(msg => msg.id === lastMessage.id) || 
       (previousMessagesRef.current.length > 0 && messages.length > previousMessagesRef.current.length));


    if (isNewMessageFromPartner && !isInitialLoad) {
      if (document.hidden) {
        const notificationSettingsString = localStorage.getItem(NOTIFICATION_SETTINGS_KEY);
        if (notificationSettingsString) {
          try {
            const settings = JSON.parse(notificationSettingsString);
            const partnerName = chatDetails.isGroup ? chatDetails.groupName : (chatPartner?.displayName || "User");
            const senderDisplayName = lastMessage.senderDisplayName || partnerName;
            const messageIcon = lastMessage.senderPhotoURL || (chatPartner?.photoURL) || '/logo-192.png'; 

            if (settings.desktopEnabled && Notification.permission === 'granted') {
              new Notification(senderDisplayName, {
                body: lastMessage.text,
                icon: messageIcon,
              });
            }

            if (settings.soundEnabled) {
              const audio = new Audio('/sounds/notification-sound.mp3');
              audio.play().catch(error => {
                console.warn("Error playing notification sound. User interaction might be required first or sound file missing:", error);
              });
            }
          } catch (e) {
            console.error("Error parsing notification settings:", e);
          }
        }
      }
    }
    previousMessagesRef.current = [...messages];
  }, [messages, currentUser, chatDetails, chatPartner]);


  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === "" || !currentUser || !chatDetails) return;
    setSendingMessage(true);

    let replyData: Partial<ChatMessage> = {};
    if (replyingToMessage) {
      replyData = {
        replyTo: replyingToMessage.id,
        repliedMessageText: replyingToMessage.text.substring(0, 70) + (replyingToMessage.text.length > 70 ? '...' : ''),
        repliedMessageSender: replyingToMessage.senderDisplayName || "User",
      };
    }

    const messageData: Omit<ChatMessage, "id"> = {
      text: newMessage,
      senderId: currentUser.uid,
      timestamp: serverTimestamp(),
      status: 'sent', 
      senderPhotoURL: currentUser.photoURL || null,
      senderDisplayName: currentUser.displayName || currentUser.email || "User",
      ...replyData,
    };

    try {
      const messagesColRef = collection(db, "chats", chatId, "messages");
      await addDoc(messagesColRef, messageData);

      const chatDocRef = doc(db, "chats", chatId);
      await updateDoc(chatDocRef, {
        lastMessage: {
          text: newMessage,
          timestamp: serverTimestamp(),
          senderId: currentUser.uid,
        },
        updatedAt: serverTimestamp(),
        participants: arrayUnion(currentUser.uid) 
      });
      setNewMessage("");
      handleSetReplyingToMessage(null); // Clear reply mode & AI suggestions
    } catch (error) {
      console.error("Error sending message: ", error);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleSetReplyingToMessage = (message: ChatMessage | null) => {
    setReplyingToMessage(message);
    if (message) {
      fetchAiSuggestions(message.text); 
      inputRef.current?.focus();
    } else {
      setAiSuggestions([]); 
      setLoadingAiSuggestions(false);
    }
  };
  
  const partnerName = chatDetails?.isGroup ? chatDetails.groupName : (rtdbPartnerStatus?.displayName || chatPartner?.displayName);
  const partnerAvatar = chatDetails?.isGroup ? chatDetails.groupAvatar : chatPartner?.photoURL;
  const partnerDataAiHint = chatDetails?.isGroup ? "group avatar" : (chatPartner as any)?.dataAiHint || "person avatar";
  
  const getPartnerStatus = () => {
    if (chatDetails?.isGroup) return null;
    if (rtdbPartnerStatus) {
      if (rtdbPartnerStatus.isOnline) return <span className="text-xs text-green-500">Online</span>;
      if (rtdbPartnerStatus.lastSeen) return <span className="text-xs text-muted-foreground">Last seen {formatRelativeTime(rtdbPartnerStatus.lastSeen)}</span>;
    } else if (chatPartner) {
      // Fallback to Firestore status if RTDB is not available for some reason
      if ((chatPartner as User).isOnline) return <span className="text-xs text-green-500">Online</span>;
      if ((chatPartner as User).lastSeen) return <span className="text-xs text-muted-foreground">Last seen {formatRelativeTime((chatPartner as User).lastSeen!)}</span>;
    }
    return <span className="text-xs text-muted-foreground">Offline</span>;
  };

  if (loadingChat) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-2 text-muted-foreground">Loading chat...</p>
      </div>
    );
  }

  if (!chatDetails) {
     return (
      <div className="flex flex-col h-full items-center justify-center p-4 text-center">
        <Info className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Chat not found</h2>
        <p className="text-muted-foreground mb-4">The chat you are looking for does not exist or you may not have access to it.</p>
        <Button onClick={() => router.push('/chat')}>Go to Chats</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="flex items-center justify-between p-3 border-b bg-card shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/chat" className="md:hidden">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          {partnerAvatar && <CustomAvatar src={partnerAvatar} alt={partnerName || "Chat partner"} className="h-10 w-10" data-ai-hint={partnerDataAiHint} />}
          {!partnerAvatar && <CustomAvatar fallback={partnerName?.charAt(0) || "?"} alt={partnerName || "Chat partner"} className="h-10 w-10" data-ai-hint={partnerDataAiHint} />}
          <div>
            <h2 className="font-semibold text-foreground">{partnerName || "Chat"}</h2>
            {getPartnerStatus()}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary"><Phone className="h-5 w-5" /></Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary"><Video className="h-5 w-5" /></Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary"><Info className="h-5 w-5" /></Button>
        </div>
      </header>

      <ScrollArea className="flex-1 p-4" viewportRef={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-end gap-2 group ${ 
                msg.senderId === currentUser?.uid ? "justify-end" : "justify-start"
              }`}
            >
              {msg.senderId !== currentUser?.uid && (
                <CustomAvatar src={msg.senderPhotoURL} alt={msg.senderDisplayName || "Sender"} fallback={msg.senderDisplayName?.charAt(0) || "S"} className="h-8 w-8" data-ai-hint="person avatar"/>
              )}
              <div className={`flex items-center gap-2 ${msg.senderId === currentUser?.uid ? 'flex-row-reverse' : 'flex-row'}`}>
                <div
                  className={`min-w-32 max-w-[70%] p-3 shadow ${
                    msg.senderId === currentUser?.uid
                      ? "bg-primary text-primary-foreground rounded-xl rounded-bl-none"
                      : "bg-card text-card-foreground rounded-xl rounded-br-none border"
                  }`}
                >
                  {msg.replyTo && msg.repliedMessageText && (
                     <div className={`mb-1.5 pl-2.5 py-1 pr-1 border-l-2 min-w-0 ${
                        msg.senderId === currentUser?.uid
                            ? 'border-primary-foreground/60'
                            : 'border-accent'
                    }`}>
                      <p className={`font-semibold text-sm ${
                          msg.senderId === currentUser?.uid
                              ? 'text-primary-foreground'
                              : 'text-accent'
                      }`}>
                        {msg.repliedMessageSender === (currentUser?.displayName || currentUser?.email) ? "You" : msg.repliedMessageSender}
                      </p>
                      <p className={`break-words text-sm ${
                          msg.senderId === currentUser?.uid
                              ? 'text-primary-foreground/90'
                              : 'text-muted-foreground'
                      }`}>
                        {msg.repliedMessageText}
                      </p>
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                  <div className="flex items-center justify-end gap-1 mt-1">
                      <p className={`text-xs ${msg.senderId === currentUser?.uid ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {formatMessageTimestamp(msg.timestamp)}
                      </p>
                      {msg.senderId === currentUser?.uid && msg.status === 'sent' && (
                          <Check className="h-3.5 w-3.5 text-primary-foreground/70" />
                      )}
                  </div>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
                    onClick={() => handleSetReplyingToMessage(msg)}
                    aria-label="Reply to message"
                >
                    <MessageSquareReply className="h-4 w-4" />
                </Button>
              </div>
              {msg.senderId === currentUser?.uid && currentUser && (
                  <CustomAvatar 
                    src={currentUser.photoURL} 
                    alt={currentUser.displayName || "You"} 
                    fallback={(currentUser.displayName || currentUser.email || "Y").charAt(0)}
                    className="h-8 w-8"
                    data-ai-hint="person avatar"
                   />
                )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      <footer className="border-t bg-card">
        {replyingToMessage && currentUser && (
          <div className="p-2.5 border-b bg-background/80 flex justify-between items-center">
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="text-xs font-semibold text-primary">
                Replying to {replyingToMessage.senderId === currentUser?.uid ? "yourself" : (replyingToMessage.senderDisplayName || "User")}
              </p>
              <p className="text-sm text-muted-foreground truncate">
                {replyingToMessage.text}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => handleSetReplyingToMessage(null)} className="text-muted-foreground hover:text-destructive">
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
         {(aiSuggestions.length > 0 && !loadingAiSuggestions) && (
          <div className="p-2 flex flex-wrap gap-2 border-b items-center">
            <p className="text-xs text-muted-foreground mr-2">Suggestions:</p>
            {aiSuggestions.map((suggestion, index) => (
            <Button
                key={index}
                variant="outline"
                size="sm"
                className="text-xs h-auto py-1 px-2"
                onClick={() => {
                  setNewMessage(suggestion);
                  setAiSuggestions([]); 
                  inputRef.current?.focus();
                }}
            >
                {suggestion}
            </Button>
            ))}
          </div>
        )}
        {loadingAiSuggestions && (
            <div className="p-2 flex justify-center items-center border-b">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="ml-2 text-xs text-muted-foreground">Getting AI suggestions...</span>
            </div>
        )}
        <form onSubmit={handleSendMessage} className="flex items-center gap-2 p-3">
          <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
            <Smile className="h-5 w-5" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
            <Paperclip className="h-5 w-5" />
          </Button>
          <Input
            ref={inputRef}
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => {
                setNewMessage(e.target.value);
                if (e.target.value.trim() !== '' && aiSuggestions.length > 0) {
                    // Clear suggestions if the typed message no longer starts with any suggestion
                    if (!aiSuggestions.some(suggestion => e.target.value.startsWith(suggestion))) {
                         setAiSuggestions([]);
                    }
                }
            }}
            className="flex-1 bg-background focus:bg-background/90"
            autoComplete="off"
            disabled={sendingMessage}
          />
          {newMessage.trim() && !sendingMessage ? (
            <Button type="submit" size="icon" className="bg-primary hover:bg-primary/90">
              <SendHorizonal className="h-5 w-5 text-primary-foreground" />
            </Button>
          ) : sendingMessage ? (
            <Button type="button" size="icon" className="bg-primary hover:bg-primary/90" disabled>
                <Loader2 className="h-5 w-5 animate-spin text-primary-foreground" />
            </Button>
          ) : (
            <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
              <Mic className="h-5 w-5" />
            </Button>
          )}
        </form>
      </footer>
    </div>
  );
}
