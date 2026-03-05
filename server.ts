import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import multer from "multer";
import fs from "fs";

// --- Configuration ---
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "paw-rescue-secret-key-2024";
const db = new Database("rescue.db");

// --- Database Initialization ---
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'volunteer', 'adopter')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS pets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    breed TEXT,
    age INTEGER,
    type TEXT,
    description TEXT,
    image_url TEXT,
    status TEXT DEFAULT 'available' CHECK(status IN ('available', 'adopted', 'rescue', 'requested')),
    location_lat REAL,
    location_lng REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS rescues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reporter_id INTEGER,
    pet_description TEXT,
    image_url TEXT,
    lat REAL,
    lng REAL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed')),
    assigned_volunteer_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(reporter_id) REFERENCES users(id),
    FOREIGN KEY(assigned_volunteer_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS adoptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pet_id INTEGER,
    adopter_id INTEGER,
    reason TEXT,
    experience TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
    request_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(pet_id) REFERENCES pets(id),
    FOREIGN KEY(adopter_id) REFERENCES users(id)
  );
`);

// Seed Admin if not exists
const adminExists = db.prepare("SELECT * FROM users WHERE role = 'admin'").get();
if (!adminExists) {
  const hashedPassword = bcrypt.hashSync("admin123", 10);
  db.prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)").run(
    "System Admin",
    "admin@pawrescue.com",
    hashedPassword,
    "admin"
  );
}

// Seed Pets
const initialPets = [
  { name: "Buddy", breed: "Golden Retriever", age: 2, type: "dog", description: "A friendly and energetic pup who loves to play fetch.", image_url: "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=400" },
  { name: "Luna", breed: "Siamese", age: 1, type: "cat", description: "Very vocal and affectionate. Looking for a quiet home.", image_url: "https://images.unsplash.com/photo-1513245543132-31f507417b26?auto=format&fit=crop&q=80&w=400" },
  { name: "Max", breed: "Beagle", age: 4, type: "dog", description: "Great with kids and other dogs. Very calm temperament.", image_url: "https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?auto=format&fit=crop&q=80&w=400" },
  { name: "Oliver", breed: "Tabby", age: 3, type: "cat", description: "A curious explorer who loves climbing and bird watching.", image_url: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=400" },
  { name: "Bella", breed: "Persian", age: 2, type: "cat", description: "A graceful and calm cat who enjoys being pampered.", image_url: "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&q=80&w=400" },
  { name: "Charlie", breed: "Poodle", age: 3, type: "dog", description: "Highly intelligent and active. Loves learning new tricks.", image_url: "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&q=80&w=400" },
  { name: "Daisy", breed: "Rabbit", age: 1, type: "other", description: "A sweet and gentle bunny who loves fresh greens.", image_url: "https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?auto=format&fit=crop&q=80&w=400" },
  { name: "Milo", breed: "Hamster", age: 1, type: "other", description: "Small, active, and very cute. Loves his exercise wheel.", image_url: "https://images.unsplash.com/photo-1548767797-d8c844163c4c?auto=format&fit=crop&q=80&w=400" },
  { name: "Coco", breed: "Labrador", age: 5, type: "dog", description: "A loyal companion who is great for long walks.", image_url: "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=400" },
  { name: "Simba", breed: "Maine Coon", age: 4, type: "cat", description: "A large, gentle giant with a beautiful fluffy coat.", image_url: "https://images.unsplash.com/photo-1533738363-b7f9aef128ce?auto=format&fit=crop&q=80&w=400" },
  { name: "Rocky", breed: "German Shepherd", age: 3, type: "dog", description: "Protective, smart, and very active. Needs an experienced owner.", image_url: "https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?auto=format&fit=crop&q=80&w=400" },
  { name: "Nala", breed: "Bengal", age: 2, type: "cat", description: "Exotic looking and very playful. Loves interactive toys.", image_url: "https://images.unsplash.com/photo-1513245543132-31f507417b26?auto=format&fit=crop&q=80&w=400" }
];

initialPets.forEach(p => {
  const exists = db.prepare("SELECT id FROM pets WHERE name = ?").get(p.name);
  if (!exists) {
    db.prepare("INSERT INTO pets (name, breed, age, type, description, image_url) VALUES (?, ?, ?, ?, ?, ?)").run(p.name, p.breed, p.age, p.type, p.description, p.image_url);
  }
});

// --- Middleware & Setup ---
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" }
});

app.use(express.json({ limit: '10mb' }));

// Multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });
app.use('/uploads', express.static('uploads'));

// --- Auth Middleware ---
const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// Upload Endpoint
app.post("/api/upload", authenticate, upload.single('image'), (req: any, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const imageUrl = `/uploads/${req.file.filename}`;
  res.json({ imageUrl });
});

// --- API Routes ---

// Auth
app.post("/api/auth/register", (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = db.prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)").run(name, email, hashedPassword, role || 'adopter');
    const user = { id: result.lastInsertRowid, name, email, role: role || 'adopter' };
    const token = jwt.sign(user, JWT_SECRET);
    res.json({ token, user });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  const user: any = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (user && bcrypt.compareSync(password, user.password)) {
    const { password: _, ...userWithoutPassword } = user;
    const token = jwt.sign(userWithoutPassword, JWT_SECRET);
    res.json({ token, user: userWithoutPassword });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

// Pets
app.get("/api/pets", (req, res) => {
  const pets = db.prepare("SELECT * FROM pets WHERE status IN ('available', 'requested')").all();
  res.json(pets);
});

app.post("/api/pets", authenticate, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
  const { name, breed, age, type, description, image_url } = req.body;
  const result = db.prepare("INSERT INTO pets (name, breed, age, type, description, image_url) VALUES (?, ?, ?, ?, ?, ?)").run(name, breed, age, type, description, image_url);
  res.json({ id: result.lastInsertRowid });
});

// Rescues
app.post("/api/rescues", authenticate, (req: any, res) => {
  const { pet_description, image_url, lat, lng } = req.body;
  const result = db.prepare("INSERT INTO rescues (reporter_id, pet_description, image_url, lat, lng) VALUES (?, ?, ?, ?, ?)").run(req.user.id, pet_description, image_url, lat, lng);
  
  // Notify volunteers
  io.emit("new_rescue", { id: result.lastInsertRowid, lat, lng, pet_description });
  
  res.json({ id: result.lastInsertRowid });
});

app.get("/api/rescues", authenticate, (req: any, res) => {
  let rescues;
  if (req.user.role === 'admin') {
    rescues = db.prepare(`
      SELECT r.*, u.name as reporter_name, v.name as volunteer_name 
      FROM rescues r 
      LEFT JOIN users u ON r.reporter_id = u.id 
      LEFT JOIN users v ON r.assigned_volunteer_id = v.id
    `).all();
  } else if (req.user.role === 'volunteer') {
    rescues = db.prepare("SELECT * FROM rescues WHERE assigned_volunteer_id = ? OR status = 'pending'").all(req.user.id);
  } else {
    rescues = db.prepare("SELECT * FROM rescues WHERE reporter_id = ?").all(req.user.id);
  }
  res.json(rescues);
});

app.patch("/api/rescues/:id", authenticate, (req: any, res) => {
  const { id } = req.params;
  const { status, assigned_volunteer_id } = req.body;
  
  if (assigned_volunteer_id) {
    db.prepare("UPDATE rescues SET assigned_volunteer_id = ?, status = 'in_progress' WHERE id = ?").run(assigned_volunteer_id, id);
  } else if (status) {
    db.prepare("UPDATE rescues SET status = ? WHERE id = ?").run(status, id);
  }
  
  res.json({ success: true });
});

// Adoptions
app.post("/api/adoptions", authenticate, (req: any, res) => {
  const { pet_id, reason, experience } = req.body;
  
  // Check if already requested
  const existing = db.prepare("SELECT * FROM adoptions WHERE pet_id = ? AND adopter_id = ? AND status = 'pending'").get(pet_id, req.user.id);
  if (existing) {
    return res.status(400).json({ error: "You already have a pending adoption request for this pet." });
  }

  db.prepare("INSERT INTO adoptions (pet_id, adopter_id, reason, experience) VALUES (?, ?, ?, ?)").run(pet_id, req.user.id, reason, experience);
  db.prepare("UPDATE pets SET status = 'requested' WHERE id = ?").run(pet_id);
  res.json({ success: true });
});

app.get("/api/adoptions", authenticate, (req: any, res) => {
  let adoptions;
  if (req.user.role === 'admin') {
    adoptions = db.prepare(`
      SELECT a.*, p.name as pet_name, u.name as adopter_name 
      FROM adoptions a 
      JOIN pets p ON a.pet_id = p.id 
      JOIN users u ON a.adopter_id = u.id
    `).all();
  } else {
    adoptions = db.prepare(`
      SELECT a.*, p.name as pet_name 
      FROM adoptions a 
      JOIN pets p ON a.pet_id = p.id 
      WHERE a.adopter_id = ?
    `).all(req.user.id);
  }
  res.json(adoptions);
});

app.patch("/api/adoptions/:id", authenticate, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
  const { id } = req.params;
  const { status } = req.body;
  
  db.prepare("UPDATE adoptions SET status = ? WHERE id = ?").run(status, id);
  
  if (status === 'approved') {
    const adoption: any = db.prepare("SELECT pet_id FROM adoptions WHERE id = ?").get(id);
    db.prepare("UPDATE pets SET status = 'adopted' WHERE id = ?").run(adoption.pet_id);
  }
  
  res.json({ success: true });
});

// Stats
app.get("/api/stats", authenticate, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
  const totalPets = db.prepare("SELECT COUNT(*) as count FROM pets").get() as any;
  const totalAdoptions = db.prepare("SELECT COUNT(*) as count FROM adoptions WHERE status = 'approved'").get() as any;
  const activeRescues = db.prepare("SELECT COUNT(*) as count FROM rescues WHERE status != 'completed'").get() as any;
  const recentRescues = db.prepare("SELECT * FROM rescues ORDER BY created_at DESC LIMIT 5").all();
  
  res.json({
    totalPets: totalPets.count,
    totalAdoptions: totalAdoptions.count,
    activeRescues: activeRescues.count,
    recentRescues
  });
});

// --- Socket.io Logic ---
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  
  socket.on("update_location", (data) => {
    // data: { volunteerId, lat, lng }
    socket.broadcast.emit("volunteer_location_update", data);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

// --- Vite Integration ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
