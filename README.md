
# Gongo Bongo Chat Hub

Gongo Bongo Chat Hub is a modern, real-time messaging application built with Next.js, React, Firebase, ShadCN UI, Tailwind CSS, and Genkit for AI-powered features.

## Features Implemented

**1. Authentication:**
*   User Signup: New users can create accounts using email/password.
*   User Login: Existing users can log in with their email/password.
*   Google Sign-In: Users can sign up or log in using their Google accounts.
*   Display Name & Avatar: Users provide a display name during email/password signup. Avatars default to the first letter of the display name.

**2. Real-time Chat & Messaging:**
*   One-on-One Chat: Users can engage in private conversations.
*   Firestore Message Storage: All messages are stored and retrieved from Firestore.
*   Real-time Message Updates: New messages appear instantly without needing a page refresh.
*   Message Timestamps: Each message displays the time it was sent.
*   Message Status Ticks:
    *   Single grey tick indicates the message has been sent.
*   Reply to Messages: Users can reply to specific messages, with the original message quoted in the reply.

**3. User Presence:**
*   Online/Offline Status: Users can see if their chat partners are currently online.
*   Last Seen: If a user is offline, their "last seen" time is displayed (e.g., "Last seen 5 minutes ago").
*   Firebase Realtime Database: Used for robust and instant presence updates, including handling browser close events.

**4. Chat Request System (Instagram-like):**
*   Initiate Chat from Contacts: Users can find other registered users in the "Contacts" section.
*   Send Invitation Message: To start a chat with a new contact, the initiator sends one initial message as an invitation.
*   Requests Section: Recipients see incoming chat invitations in a dedicated "Requests" section in the sidebar.
*   Accept Invitation: The recipient can open a chat request and accept the invitation.
*   Accepted Chats: Once accepted, the chat moves to the main "Your Chats" list for both users, enabling full two-way communication.

**5. User Interface & Experience (UI/UX):**
*   Modern Tech Stack: Built with Next.js (App Router), React, ShadCN UI components, and Tailwind CSS.
*   Sidebar Navigation: Easy navigation between "Your Chats," "Contacts," "Requests," and "Settings."
*   WhatsApp-like Chat Bubbles: Message bubbles are styled with "tails" to indicate sender/receiver, similar to popular messaging apps.
*   Timestamp & Tick Placement: Timestamps and status ticks are correctly positioned at the bottom-right of message bubbles.
*   Sleek Chat Bubbles: Bubbles have a minimum width for a cleaner look, even for short messages.
*   Scroll to Last Message: Chat screens automatically scroll to the latest message upon opening and when new messages arrive. Sidebar also scrolls to show the active chat.

**6. AI-Powered Features (Genkit & Google Gemini 2.0 Flash):**
*   Smart Reply Suggestions: When a user clicks the "reply" button on a message, AI-generated reply suggestions are provided.
*   Contextual & Multilingual Suggestions: Suggestions are tailored to the content and language of the message being replied to.

**7. Settings & Customization:**
*   Theme Toggle: Users can switch between Light and Dark modes in the Settings page. Theme preference is saved in `localStorage`.
*   Notification Preferences:
    *   Desktop Notifications: Users can enable/disable desktop notifications. Requires browser permission.
    *   Sound Notifications: Users can enable/disable sound notifications for new messages.
*   Notification System:
    *   Desktop notifications are shown for new messages if enabled and the chat tab is inactive.
    *   Sound notifications are played for new messages if enabled and the chat tab is inactive.

## Local Setup & Running the Application

Follow these instructions to set up and run the Gongo Bongo Chat Hub on your local machine.

**Prerequisites:**
*   **Node.js:** Version 18.x or later recommended. (Download from [nodejs.org](https://nodejs.org/))
*   **npm** (Node Package Manager): Comes with Node.js.
*   **Firebase Project:** You need an active Firebase project with the following services enabled:
    *   Firebase Authentication (Email/Password and Google Sign-In methods enabled)
    *   Firestore Database
    *   Firebase Realtime Database
    *   Firebase Storage (optional, for future avatar uploads)
*   **Google AI API Key:** For Genkit AI features. You can get this from [Google AI Studio](https://aistudio.google.com/app/apikey).

**Steps:**

1.  **Clone/Download the Project:**
    Obtain the project code and navigate into the project's root directory in your terminal.

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Set Up Environment Variables:**
    Create a `.env` file in the root of your project directory. Copy the contents of `.env.example` (if provided) or add the following variables, replacing the placeholder values with your actual Firebase project credentials and Google AI API Key:

    ```env
    # Firebase Environment Variables
    NEXT_PUBLIC_FIREBASE_API_KEY="YOUR_FIREBASE_API_KEY"
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="YOUR_FIREBASE_AUTH_DOMAIN"
    NEXT_PUBLIC_FIREBASE_PROJECT_ID="YOUR_FIREBASE_PROJECT_ID"
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="YOUR_FIREBASE_STORAGE_BUCKET"
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="YOUR_FIREBASE_MESSAGING_SENDER_ID"
    NEXT_PUBLIC_FIREBASE_APP_ID="YOUR_FIREBASE_APP_ID"
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="YOUR_FIREBASE_MEASUREMENT_ID" # Optional for basic Firebase setup, required if using Analytics
    NEXT_PUBLIC_FIREBASE_DATABASE_URL="YOUR_FIREBASE_REALTIME_DATABASE_URL"

    # Google AI API Key for Genkit
    GOOGLE_API_KEY="YOUR_GOOGLE_AI_API_KEY"
    ```
    *   You can find your Firebase credentials in your Firebase project settings (Project settings > General > Your apps > Web app).
    *   Ensure your Firebase Realtime Database URL is correctly added.
    *   Make sure the domains you'll be running the app from (e.g., `localhost`) are added to the "Authorized domains" list in Firebase Authentication settings.

4.  **Run the Next.js Development Server:**
    ```bash
    npm run dev
    ```
    This command usually starts the application on `http://localhost:9002` (as configured in `package.json`). Check your terminal output for the exact URL.

5.  **(Optional) Run the Genkit AI Flows Locally:**
    If you want to test or develop the AI features (like reply suggestions), you need to run the Genkit development server in a separate terminal:
    ```bash
    npm run genkit:dev
    ```
    Or for auto-reloading on changes to AI flow files:
    ```bash
    npm run genkit:watch
    ```
    Genkit usually starts on port `3400` or `4000`. Check its terminal output.

6.  **Access the Application:**
    Open your web browser and navigate to the URL provided by the `npm run dev` command (e.g., `http://localhost:9002`).

You should now have the Gongo Bongo Chat Hub running locally!

## Project Structure Highlights

*   `src/app/`: Contains the Next.js App Router pages and layouts.
*   `src/components/`: Shared UI components (ShadCN UI, custom components).
*   `src/contexts/`: React Context providers (e.g., `AuthProvider`).
*   `src/hooks/`: Custom React hooks.
*   `src/lib/`: Utility functions, Firebase initialization (`firebase.ts`), type definitions (`types.ts`).
*   `src/ai/`: Genkit AI flows and configuration.
*   `public/`: Static assets (e.g., sounds, images).

---

Happy chatting with Gongo Bongo!
