/* The above code is a TypeScript application that uses the Hono framework to build web applications.
It includes routes for handling various API requests related to PD Enterprise, user management, and
CNotes. Here is a summary of what the code is doing: */
import { Hono } from 'hono' // Import Hono framework for building web applications
import { cors } from "hono/cors" // Import CORS middleware for handling cross-origin requests
import { eq } from "drizzle-orm" // Import equality function for query building
import { validateRoute } from './utils/validateRoute' // Import function for validating route
import { checkUserExits } from './utils/checkUserExits'
import { db } from './db/users' // Import database connection
import { posts, users } from './db/users/schema' // Import posts and users schema from database
import { notesdb } from './db/cnotes'
import { notes } from "./db/cnotes/schema"
import Groq from 'groq-sdk'
import dotenv from 'dotenv'
import type { Context } from 'hono'
dotenv.config() // Load environment variables from .env file

interface ChatMessage {
    role: string;
    content: string;
}

// VARIABLES
// Create a new Hono application instance
const app = new Hono()
let chatHistory: ChatMessage[] = []
const initial_socratic_message: ChatMessage = {
    role: "user",
    content: `You are a Socratic Teacher. And I am your student. And please try to keep your replies as brief as possible, while explaining each topic carefully. Please Explain the topic in relation to the NCERT CBSE 2024 curriculum. Please don't give the answer directly but rather a starting point to get started, your job is to help the student find the answer in his/her own way.
Also please return your answer in HTML format, with proper tags.`
}
const initial_message: ChatMessage = {
    role: "user",
    content: `Please return your answer in HTML format, with proper tags, only send inside the <body> tags, no need for the boilerplate or <body> tag.
        always return your whole answer strictly in the following json syntax: {summary: "[a short summary in a few words of the prompt"]", content: "[your response]"}`
}
let chatCompletion: any

// FUNCTIONS
async function chatWithHistory(userMessage: string, modal: string, groq: any, modalParams: { type: string }): Promise<string | undefined> {
    chatHistory = [...chatHistory, { role: "user", content: userMessage }]
    if (modalParams.type === "custom") {
        chatCompletion = await groq.chat.completions.create({
            messages: [...chatHistory, initial_socratic_message],
            model: modal
        })
    } else if (modalParams.type === "direct") {
        chatCompletion = await groq.chat.completions.create({
            messages: [...chatHistory, initial_message],
            model: modal
        })
    }
    const response = chatCompletion.choices[0]?.message?.content
    chatHistory = [...chatHistory, { role: "assistant", content: response }]
    return response
}

// ROUTES
// Define a route for the root URL
app.get('/', (c) => {
    c.status(200)
    return c.text("This is the backend-service for PD Enterprise.")
})
// Define a route for handling not found errors
app.notFound((c) => {
    c.status(404) // Set the HTTP status code to 404 (Not Found)
    return c.json({
        status: 404, // Status code
        message: "Not Found", // Error message
        data: null,
        error: null,
    })
})
// Define a route for handling errors
app.onError((err: Error, c: Context) => {
    console.error(`${err.message}\n${err.stack}`)
    return c.json({
        status: 500,
        message: "Internal Server Error",
        data: null,
        error: err.message
    }, 500)
})
// Apply CORS middleware to all routes
app.use("*", cors())

// PD ENTERPRISE API ROUTES
// Define a route for fetching all blog posts
app.get("/pd-enterprise/blog/posts", async (c) => {
    if (validateRoute(c.req.header("origin") || '')) {
        try {
            const allPosts = await db.select().from(posts); // Fetch all posts from the database
            c.status(200); // Set the HTTP status code to 200 (OK)
            return c.json({ status: 200, message: "Posts Data found.", data: allPosts, error: null }) // Return a JSON response with the posts data
        } catch (error) {
            c.status(500); // Set the HTTP status code to 500 (Internal Server Error)
            return c.json({ status: 500, message: "There was an error", data: null, error }) // Return a JSON response with the error
        }
    } else {
        c.status(500)
        return c.json({ status: 500, message: "Origin not allowed", data: null, error: null })
    }
})
// Define a route for fetching a single blog post by slug
app.get("/pd-enterprise/blog/posts/:slug", async (c) => {
    if (validateRoute(c.req.header("origin") || "")) {
        const slug = c.req.param("slug");
        try {
            const post = await db.select().from(posts).where(eq(posts.slug, slug))
            c.status(200);
            return c.json({ status: 200, message: "Post data found.", data: post, error: null })
        } catch (error) {
            c.status(500);
            return c.json({ status: 500, message: "There was error", data: null, error })
        }
    } else {
        c.status(500)
        return c.json({ status: 500, message: "Origin not allowed", data: null, error: null })
    }
})

// USER MANAGEMENT API ROUTES
app.post("/users/roles/get-role", async (c: Context) => {
    if (validateRoute(c.req.header("origin") || "")) {
        const body = await c.req.json()
        if (!body.email) {
            c.status(400)
            return c.json({ status: 400, message: "Missing required fields", data: null, error: null })
        }
        const email = body.email
        try {
            const role = await db.select({ role: users.membership }).from(users).where(eq(users.email, email))
            
            // If no user found
            if (role.length === 0) {
                c.status(404)
                return c.json({ 
                    status: 404, 
                    message: "User not found", 
                    data: null, 
                    error: null 
                })
            }

            // If role is null, undefined, or empty string
            if (!role[0].role || role[0].role === "") {
                const updatedUser = await db.update(users)
                    .set({ membership: "tier-1" })
                    .where(eq(users.email, email))
                    .returning()

                return c.json({ 
                    status: 200, 
                    message: "Role updated successfully", 
                    data: "tier-1", 
                    error: null 
                })
            }

            return c.json({ 
                status: 200, 
                message: "Role found successfully", 
                data: role[0].role, 
                error: null 
            })
        } catch (error) {
            console.error(error)
            c.status(500)
            return c.json({ 
                status: 500, 
                message: "Database error while fetching/updating role", 
                data: null, 
                error 
            })
        }
    } else {
        c.status(403)
        return c.json({ status: 403, message: "Origin not allowed", data: null, error: null })
    }
})

// CNOTES API ROUTES
app.post("/notes/notes", async (c: Context) => {
    if (validateRoute(c.req.header("origin") || "")) {
        const body = await c.req.json()
        if (!body.email) {
            c.status(400)
            return c.json({ status: 400, message: "Missing required fields: email", data: null, error: null })
        }
        const email = body.email
        try {
            const getNotes = await notesdb.select().from(notes).where(eq(notes.userEmail, email))
            return c.json({ status: 200, message: "Notes found successfully", data: getNotes, error: null })
        } catch (error) {
            console.error(error)
            c.status(500)
            return c.json({ status: 500, message: "Database error while fetching notes", data: null, error })
        }
    } else {
        c.status(403)
        return c.json({ status: 403, message: "Origin not allowed", data: null, error: null })
    }
})

app.post("/notes/create", async (c: Context) => {
    if (validateRoute(c.req.header("origin") || "")) {
        const body = await c.req.json()
        const requiredFields = ['title', 'slug', 'notecontent', 'subject', 'grade', 'email']
        const missingFields = requiredFields.filter(field => !body[field])
        
        if (missingFields.length > 0) {
            c.status(400)
            return c.json({ 
                status: 400, 
                message: `Missing required fields: ${missingFields.join(', ')}`, 
                data: null, 
                error: null 
            })
        }

        try {
            const userExists = await checkUserExits(body.email)
            if (!userExists) {
                c.status(404)
                return c.json({ status: 404, message: "User doesn't exist", data: null, error: null })
            }

            const newNote = await notesdb.insert(notes).values({
                title: body.title,
                slug: body.slug,
                notecontent: body.notecontent,
                subject: body.subject,
                grade: body.grade,
                userEmail: body.email,
                board: body.board || null,
                school: body.school || null,
                dateCreated: new Date(),
                dateUpdated: new Date()
            }).returning()

            return c.json({ 
                status: 201, 
                message: "Note created successfully", 
                data: newNote[0], 
                error: null 
            })
        } catch (error: any) {
            console.error(error)
            if (error.code === '23505') { // Unique constraint violation
                c.status(409)
                return c.json({ 
                    status: 409, 
                    message: "A note with this slug already exists", 
                    data: null, 
                    error: null 
                })
            }
            c.status(500)
            return c.json({ 
                status: 500, 
                message: "Database error while creating note", 
                data: null, 
                error 
            })
        }
    } else {
        c.status(403)
        return c.json({ status: 403, message: "Origin not allowed", data: null, error: null })
    }
})

app.put("/notes/update/:slug", async (c: Context) => {
    if (validateRoute(c.req.header("origin") || "")) {
        const slug = c.req.param("slug")
        const body = await c.req.json()
        
        if (!body.email) {
            c.status(400)
            return c.json({ 
                status: 400, 
                message: "Missing required field: email", 
                data: null, 
                error: null 
            })
        }

        try {
            const userExists = await checkUserExits(body.email)
            if (!userExists) {
                c.status(404)
                return c.json({ status: 404, message: "User doesn't exist", data: null, error: null })
            }

            // Check if note exists and belongs to user
            const existingNote = await notesdb.select()
                .from(notes)
                .where(eq(notes.slug, slug))
                .where(eq(notes.userEmail, body.email))
            
            if (existingNote.length === 0) {
                c.status(404)
                return c.json({ 
                    status: 404, 
                    message: "Note not found or you don't have permission to update it", 
                    data: null, 
                    error: null 
                })
            }

            const updateData: any = {}
            const allowedFields = ['title', 'notecontent', 'subject', 'grade', 'board', 'school']
            
            allowedFields.forEach(field => {
                if (body[field] !== undefined) {
                    updateData[field] = body[field]
                }
            })
            
            if (Object.keys(updateData).length === 0) {
                c.status(400)
                return c.json({ 
                    status: 400, 
                    message: "No valid fields to update", 
                    data: null, 
                    error: null 
                })
            }

            updateData.dateUpdated = new Date()

            const updatedNote = await notesdb.update(notes)
                .set(updateData)
                .where(eq(notes.slug, slug))
                .where(eq(notes.userEmail, body.email))
                .returning()

            return c.json({ 
                status: 200, 
                message: "Note updated successfully", 
                data: updatedNote[0], 
                error: null 
            })
        } catch (error) {
            console.error(error)
            c.status(500)
            return c.json({ 
                status: 500, 
                message: "Database error while updating note", 
                data: null, 
                error 
            })
        }
    } else {
        c.status(403)
        return c.json({ status: 403, message: "Origin not allowed", data: null, error: null })
    }
})

app.delete("/notes/delete/:slug", async (c: Context) => {
    if (validateRoute(c.req.header("origin") || "")) {
        const slug = c.req.param("slug")
        const body = await c.req.json()
        
        if (!body.email) {
            c.status(400)
            return c.json({ 
                status: 400, 
                message: "Missing required field: email", 
                data: null, 
                error: null 
            })
        }

        try {
            const userExists = await checkUserExits(body.email)
            if (!userExists) {
                c.status(404)
                return c.json({ status: 404, message: "User doesn't exist", data: null, error: null })
            }

            const deletedNote = await notesdb.delete(notes)
                .where(eq(notes.slug, slug))
                .where(eq(notes.userEmail, body.email))
                .returning()

            if (deletedNote.length === 0) {
                c.status(404)
                return c.json({ 
                    status: 404, 
                    message: "Note not found or you don't have permission to delete it", 
                    data: null, 
                    error: null 
                })
            }

            return c.json({ 
                status: 200, 
                message: "Note deleted successfully", 
                data: deletedNote[0], 
                error: null 
            })
        } catch (error) {
            console.error(error)
            c.status(500)
            return c.json({ 
                status: 500, 
                message: "Database error while deleting note", 
                data: null, 
                error 
            })
        }
    } else {
        c.status(403)
        return c.json({ status: 403, message: "Origin not allowed", data: null, error: null })
    }
})

app.post("/notes/note/text/:slug", async (c: Context) => {
    if (validateRoute(c.req.header("origin") || "")) {
        const slug = c.req.param("slug")
        const body = await c.req.json()
        
        if (!body.email) {
            c.status(400)
            return c.json({ 
                status: 400, 
                message: "Missing required field: email", 
                data: null, 
                error: null 
            })
        }

        try {
            const userExists = await checkUserExits(body.email)
            if (!userExists) {
                c.status(404)
                return c.json({ status: 404, message: "User doesn't exist", data: null, error: null })
            }

            const note = await notesdb.select()
                .from(notes)
                .where(eq(notes.slug, slug))
                .where(eq(notes.userEmail, body.email))

            if (note.length === 0) {
                c.status(404)
                return c.json({ 
                    status: 404, 
                    message: "Note not found or you don't have permission to view it", 
                    data: null, 
                    error: null 
                })
            }

            return c.json({ 
                status: 200, 
                message: "Successfully found note", 
                data: note[0], 
                error: null 
            })
        } catch (error) {
            console.error(error)
            c.status(500)
            return c.json({ 
                status: 500, 
                message: "Database error while fetching note", 
                data: null, 
                error 
            })
        }
    } else {
        c.status(403)
        return c.json({ status: 403, message: "Origin not allowed", data: null, error: null })
    }
})

// GRADE AI ROUTES
app.post("/ai/chat/:modal", async (c) => {
    if (validateRoute(c.req.header("origin") || "")) {
        // @ts-expect-error
        const apiKey = c.env.GROQ_API_KEY
        const groq = new Groq({ apiKey })

        const modal = c.req.param("modal")
        const body = await c.req.json()
        const modalParams = body.modalParams
        if (!body.prompt || !body.modalParams) {
            c.status(400)
            return c.json({ status: 400, message: "Missing required fields", data: null, error: null })
        }
        const prompt = body.prompt
        try {
            const chatCompletion = await chatWithHistory(prompt, modal, groq, modalParams)
            return c.json({ status: 200, message: "Successfully found note", data: chatCompletion, error: null })
        } catch (error) {
            console.error(error)
            c.status(500)
            return c.json({ status: 500, message: "There was an error", data: null, error })
        }
    } else {
        c.status(500)
        return c.json({ status: 500, message: "Origin not allowed", data: null, error: null })
    }
})

// Export the application instance
export default app