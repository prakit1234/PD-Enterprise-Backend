# PD Enterprise Backend

A robust backend service built with Hono, TypeScript, and PostgreSQL (via Drizzle ORM) that powers PD Enterprise and CNotes applications. This service provides APIs for blog management, user roles, notes management, and AI-powered educational assistance.

## 🚀 Features

- **Blog Management**: Create and manage blog posts
- **User Management**: Handle user roles and permissions
- **CNotes System**: Complete CRUD operations for educational notes
- **AI Integration**: Socratic teaching assistant using Groq AI
- **Security**: CORS protection and origin validation
- **Database**: PostgreSQL with Drizzle ORM for type-safe queries

## 📋 Prerequisites

- Node.js (v16 or higher)
- PostgreSQL Database
- Groq API Key for AI features

## 🛠️ Environment Setup

1. Create a `.env` file in the root directory with:

```env
DATABASE_URL="postgresql://user:password@host:port/dbname?sslmode=require"
CNOTES_DB_URL="postgresql://user:password@host:port/dbname?sslmode=require"
GROQ_API_KEY="your-groq-api-key"
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

## 🏃‍♂️ Running the Application

### Development
```bash
npm run dev
# or
yarn dev
```

### Production Deployment
```bash
npm run deploy
# or
yarn deploy
```

## 📚 API Documentation

### Blog Posts
- `GET /pd-enterprise/blog/posts`
  - Get all blog posts
  - Response: `{ status: number, message: string, data: Post[], error: any }`

- `GET /pd-enterprise/blog/posts/:slug`
  - Get a specific blog post
  - Response: `{ status: number, message: string, data: Post, error: any }`

### User Management
- `POST /users/roles/get-role`
  - Get or set user role
  - Body: `{ email: string }`
  - Response: `{ status: number, message: string, data: string, error: any }`

### CNotes
- `POST /notes/notes`
  - Get all notes for a user
  - Body: `{ email: string }`
  - Response: `{ status: number, message: string, data: Note[], error: any }`

- `POST /notes/create`
  - Create a new note
  - Body:
    ```typescript
    {
      email: string;
      title: string;
      slug: string;
      notecontent: string;
      subject: string;
      grade: number;
      board?: string;
      school?: string;
    }
    ```
  - Response: `{ status: number, message: string, data: Note, error: any }`

- `PUT /notes/update/:slug`
  - Update an existing note
  - Body: `{ email: string, ...updateFields }`
  - Response: `{ status: number, message: string, data: Note, error: any }`

- `DELETE /notes/delete/:slug`
  - Delete a note
  - Body: `{ email: string }`
  - Response: `{ status: number, message: string, data: Note, error: any }`

- `POST /notes/note/text/:slug`
  - Get a specific note
  - Body: `{ email: string }`
  - Response: `{ status: number, message: string, data: Note, error: any }`

### AI Chat
- `POST /ai/chat/:modal`
  - Interact with AI teaching assistant
  - Body: `{ prompt: string, modalParams: { type: "custom" | "direct" } }`
  - Response: `{ status: number, message: string, data: string, error: any }`

## 📝 Data Models

### Blog Post
```typescript
interface Post {
  postId: number;
  title: string;
  slug: string;
  content: string;
  authorId?: string;
  createdAt: string;
}
```

### Note
```typescript
interface Note {
  noteId: number;
  title: string;
  slug: string;
  notecontent: string;
  subject: string;
  grade: number;
  userEmail: string;
  board?: string;
  school?: string;
  dateCreated?: Date;
  dateUpdated?: Date;
}
```

### User
```typescript
interface User {
  id: number;
  email: string;
  membership?: string;
}
```

## 🔒 Security

- CORS protection with allowed origins configuration
- Route validation for each request
- User existence verification
- Note ownership validation
- Error handling with appropriate status codes

## 🛠️ Development

### Database Migrations

The project uses Drizzle ORM for database management. To run migrations:

1. Generate migration:
```bash
npx drizzle-kit generate:pg
```

2. Apply migration:
```bash
npx drizzle-kit push:pg
```

### Adding New Features

1. Create new routes in `src/index.ts`
2. Add schema definitions in appropriate schema files
3. Implement validation and error handling
4. Update documentation

## 📄 License

This project is proprietary and confidential. Unauthorized copying or distribution is prohibited.

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Submit a pull request

## 🐛 Known Issues

- TypeScript warnings for missing type declarations (does not affect functionality)
- Some endpoints return 500 for unauthorized access instead of 403

## 📞 Support

For support or questions, please contact the development team.
```

```
npm run deploy
```
