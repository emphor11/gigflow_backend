# Frontend Socket.io Integration Prompt

Use this prompt to implement Socket.io client-side integration in the React frontend:

---

## Prompt Text:

"Implement Socket.io client-side integration for real-time notifications in my React + Vite frontend application. 

**Backend Details:**
- Socket.io server is running on `http://localhost:3000` (same as the REST API)
- Authentication uses JWT tokens stored in HttpOnly cookies (cookie name: 'token')
- The backend accepts tokens either via cookies (automatic) OR via `socket.handshake.auth.token`

**Connection Requirements:**
1. Install `socket.io-client` package
2. Create a Socket.io connection that:
   - Connects to `http://localhost:3000`
   - Sends credentials (withCredentials: true or auth token)
   - Handles authentication using the existing JWT cookie (automatic) OR explicitly pass token via `auth: { token: userToken }`
   - Connects when user is logged in, disconnects on logout

**Event to Listen For:**
- Event name: `'hired'`
- This event is emitted when a freelancer is hired for a gig
- Event payload structure:
  ```javascript
  {
    message: "You have been hired for [Project Name]!",
    gigId: "...",
    gigTitle: "[Project Name]",
    bidId: "..."
  }
  ```

**Implementation Requirements:**
1. Create a Socket.io context/hook for managing the connection
2. Connect when user logs in (use existing auth state from Redux/Context)
3. Listen for the `'hired'` event
4. Display a notification/toast when the event is received (e.g., "You have been hired for [Project Name]!")
5. Optionally update the Redux state or local state to reflect the new bid status
6. Handle reconnection on disconnect
7. Clean up connection on logout/unmount

**Tech Stack:**
- React + Vite
- Redux Toolkit (or Context API) for state management
- Socket.io-client for the client library
- Use existing notification system (toast library) if available

**Important Notes:**
- The backend uses Socket.io v4.8.3
- Authentication is handled automatically via cookies if using `withCredentials` or you can pass token explicitly
- The event is sent to user-specific rooms, so each user only receives their own notifications
- Handle connection errors gracefully
- The connection should persist across page navigations (don't reconnect on every route change)

Please implement this following React best practices with proper cleanup and error handling."

---

## Additional Implementation Hints:

1. **Socket.io Client Setup:**
   ```javascript
   import { io } from 'socket.io-client';
   
   const socket = io('http://localhost:3000', {
     withCredentials: true, // for cookie-based auth
     // OR use explicit auth:
     // auth: { token: userToken }
   });
   ```

2. **Event Listener:**
   ```javascript
   socket.on('hired', (data) => {
     // data.message contains: "You have been hired for [Project Name]!"
     // data.gigTitle contains the project name
     // Show notification and update state
   });
   ```

3. **Connection Management:**
   - Connect when user is authenticated
   - Disconnect when user logs out
   - Clean up listeners on unmount
   - Handle reconnection logic

