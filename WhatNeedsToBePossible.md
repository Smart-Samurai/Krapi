Everything described in this document needs to be possible both from the admin dashboard webui, as well as programmatically, by making authorized requests to the backend server.

1. Create and edit and delete and view projects with

- Name
- UniqueID (unchangeable)
- Project URL (for comparing requests, defualt to localhost. In production, that would need to be the actual website that makes requests to the backend. IT serves as an extra layer of security - even with the auth info and api key, requests sent from wrong domain will be rejected. Default this setting is off before putting the app into production. This idea is taken from how Appwrite works.)

Inside projects: 2. Create and edit and delete and view and sort and filter users with

- UniqueID
- Username
- FirstName (optional)
- LastName (optional)
- Email
- Phone (optional)
- Confirmation Status (defualt false)
- RegisterDate
- UpdatedAtDate
- AccessScopes (for specific users. An admin user will have more access than a regular user. In the context of a social media app with posts - a singular user will only be able to edit their own documents and their own information, not other peoples.)
- possibility to edit the collection to add more fields with custom data, relations, strings, booleans, anything that is normally possible for pgsql collection

3. Create and edit and delete and view and sort and filter Collections with

- UniqueID
- Name
- Fields (adding fields to a collection. For example, we want a new collection, for our "posts" documents. The collection will need those following fields with types:
- text | String (with a character limit)
- uniqueID | for each message document
- creationDate | For when the post was made
- createdBy | to relate to the user who made it, pointing to their document, and conversely, the user will have a field for a collection of posts, which will hold all relations to their personal posts
- replies | to point to the id of every reply to the post by other people
- ETC, etc... as many fields as necessary.)

The point is that we can have different types for fields to select from - strings, booleans, dates, jsons (basically just a string, but with built in parsing), relations (one way, two way, etc), numbers, uniqueID (to compare to all other ID's in the db so that we don't have duplicates anywhere),

4. Create and edit and delete and view and sort and filter documents in any given collection with their data types. On the frontend, preferably as a table.

5. Upload, download, remove files in the project storage with

- Filename
- UploadDate
- FileType
- UniqueID
- Relations (to be able to know who,what uploaded the file to be able to retrieve it later easier. For example, a user can point to the ID of his avatar picture file)
- Possibly others that should be there.

6. Configure SMTP email account for a project, to send out emails to the users with authentication confirmations callback urls, password resets, newsletters, custom emails, etc.

7. Create, edit, delete, view API keys with

- Name
- Scopes (what the API key lets you do on the project. Is it a master key that allows all actions? Or maybe it could be one that only allows to read data, and never create/edit/remove it.)
- Expiry date (some date or just never)
- CreatedAt
- CreatedBy

/// Each Functionality here needs to have a instruction field on the frontend page, with a short instruction on how to call the API. This is to help the developers who use KRAPI as their full backend, so they have easy access to code to connect to KRAPI for different actions. WE need to specify code to use to connect to krapi using TYPESCRIPT and also using PYTHON (python can make requests too!)
