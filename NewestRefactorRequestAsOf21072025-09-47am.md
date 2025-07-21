Now, a huge and great task. WE need to refactor the way the database stores/ shows / relates the information to each other. We need to simplify the entire api process.

1. Instead of creating routes, and then content items for each route, we will have an API endpoint that the client can connect to, just like appwrite does.
2. upon connection, the endpoint will require valid authentication using login/password or an api key.
3. when connected, the client will have access to the database and allowed functionality based on the user access level and the api access level
4. Instead of routes now, we will be creating "projects". Each project will have it's own separate file storage and database entries.
5. Content inside a project will be created using tables with relations to each other in the databse.
6. Each separate project will support a user login / authentication structure for users in the project, admins of the project using the actual app system, and users on the final website somewhere, that are connecting to the backend api to have data shown on the website. - just like in appwrite, there is an auth tab that stores users and allows for email confirmations, sms auth, oauth, etc.
7. The project will have a database, inside which we can create types of "documents" or "collections" or however we want to call them - a schema for a kind of entry that will be used many times, with types of data inside specified, unique id's, relations between documents, etc. For example, on a social media website a "posts" collection will have it's items relate to the "user" who posted them and other things.
   The goal of this change is to make this a full and accesible modern CMS with huge level of functionality, and to reduce the needed skills and knowledge for non technical people.
   Of course, with this change, the entire frontend will need a complete rehaul as well. As well as the document keeping track of the connections used between frontend and backend, the endpoint usage, etc, how the entire app works will get a huge change. For this end, it will be okay to rebuild the frontend from scratch.
   Also in the meantime, we need to make sure we do not break the MCP functionality that currently already works. We will be adding new functions once the actual structure of the backend and frontend is finished.
