
import { config } from 'dotenv';
config();

import '@/ai/flows/summarize-message.ts';
import '@/ai/flows/suggest-reply.ts';
import '@/ai/flows/gemini-chat-bot-flow.ts'; // Add the new bot flow

    