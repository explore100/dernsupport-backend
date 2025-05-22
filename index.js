
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from './config/prisma.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = 'myhardcodedsecret';
const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads');
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

// Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    next();
  };
}

// Dummy route
app.get('/', (req, res) => {
  return res.json({ message: 'Hello World' });
});

// Signup with role
app.post('/user', async (req, res) => {
  try {
    const { email, name, password, contact, address, role } = req.body;
    const checkEmail = await prisma.user.findUnique({ where: { email } });

    if (checkEmail) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        contact,
        address,
        role: role || 'customer'
      },
    });

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      {
        expiresIn: '1h',
      }
    );

    return res.status(201).json({
      message: 'User created successfully',
      token,
      data: user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.status(200).json({
      message: 'Login successful',
      token,
      data: user,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Customer support request
router.post('/repair', authenticateToken, authorizeRoles('customer'), async (req, res) => {
  const { userId, device, issue, scheduled } = req.body;
  if (!userId || !device || !issue || !scheduled) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  try {
    const request = await prisma.supportRequest.create({
      data: {
        userId,
        device,
        issue,
        scheduled: new Date(scheduled),
      },
    });
    res.status(201).json(request);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// Admin: View all support requests
router.get('/repair', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const requests = await prisma.supportRequest.findMany({ include: { user: true } });
  res.json(requests);
});
// Admin replies to a support request
// Admin replies to a support request AND auto-approves it
router.put('/repair/:id/reply', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { id } = req.params;
  const { adminMessage } = req.body;

  try {
    const updatedRequest = await prisma.supportRequest.update({
      where: { id },
      data: {
        adminMessage,
        status: 'Approved'  // Automatically change status
      },
    });

    res.json(updatedRequest);
  } catch (err) {
    console.error('Error replying to request:', err);
    res.status(500).json({ error: 'Failed to send reply' });
  }
});



// Customer: View own support requests
router.get('/my-requests', authenticateToken, authorizeRoles('customer'), async (req, res) => {
  try {
    const userId = req.user.id;

    const requests = await prisma.supportRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch support requests' });
  }
});



// Add spare part (with image upload)
router.post('/parts', authenticateToken, authorizeRoles('admin'), upload.single('image'), async (req, res) => {
  try {
    const { name, stock } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : null;

    const part = await prisma.sparePart.create({
      data: {
        name,
        stock: parseInt(stock),
        image
      }
    });

    res.status(201).json(part);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to add spare part' });
  }
});

// Fetch and update routes (already existing)
router.get('/parts', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const parts = await prisma.sparePart.findMany();
  res.json(parts);
});

router.put('/parts/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { stock } = req.body;
  const part = await prisma.sparePart.update({
    where: { id: parseInt(req.params.id) },
    data: { stock },
  });
  res.json(part);
});
// Customer: View spare parts (read-only)
router.get('/customer/parts', authenticateToken, authorizeRoles('customer'), async (req, res) => {
  try {
    const parts = await prisma.sparePart.findMany();
    res.json(parts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch parts' });
  }
});


// Mount router
app.use('/api', router);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
