// server.js
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('public'));

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/student_activity_system', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');
}).catch((error) => {
    console.error('MongoDB connection error:', error);
});

// File Upload Configuration
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: function(req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10000000 }, // 10MB limit
    fileFilter: function(req, file, cb) {
        checkFileType(file, cb);
    }
});

// Check File Type
function checkFileType(file, cb) {
    const filetypes = /pdf|jpg|jpeg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (extname) {
        return cb(null, true);
    } else {
        cb('Error: Please upload PDF or Images only!');
    }
}

// Models
const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['student', 'staff', 'admin'], required: true }
});

const PlacementSchema = new mongoose.Schema({
    name: { type: String, required: true },
    usn: { type: String, required: true },
    phone: { type: String, required: true },
    company: { type: String, required: true },
    ctc: { type: String, required: true },
    year: { type: String, required: true },
    semester: { type: String, required: true },
    section: { type: String, required: true },
    offerLetter: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
});

const InternshipSchema = new mongoose.Schema({
    name: { type: String, required: true },
    usn: { type: String, required: true },
    phone: { type: String, required: true },
    company: { type: String, required: true },
    semester: { type: String, required: true },
    section: { type: String, required: true },
    offerLetter: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
});

const BeHonorsSchema = new mongoose.Schema({
    name: { type: String, required: true },
    usn: { type: String, required: true },
    marks1: { type: Number, required: true },
    marks2: { type: Number, required: true },
    marks3: { type: Number, required: true },
    marks4: { type: Number, required: true },
    course: { type: String, required: true },
    semester: { type: String, required: true },
    section: { type: String, required: true },
    certificate: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
});

const AdditionalCourseSchema = new mongoose.Schema({
    name: { type: String, required: true },
    usn: { type: String, required: true },
    courses: { type: String, required: true },
    completionYear: { type: String, required: true },
    duration: { type: String, required: true },
    semester: { type: String, required: true },
    section: { type: String, required: true },
    certificate: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Placement = mongoose.model('Placement', PlacementSchema);
const Internship = mongoose.model('Internship', InternshipSchema);
const BeHonors = mongoose.model('BeHonors', BeHonorsSchema);
const AdditionalCourse = mongoose.model('AdditionalCourse', AdditionalCourseSchema);

// Middleware
const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization').replace('Bearer ', '');
        const decoded = jwt.verify(token, 'your_jwt_secret');
        const user = await User.findOne({ _id: decoded._id });
        if (!user) throw new Error();
        req.user = user;
        next();
    } catch (e) {
        res.status(401).send({ error: 'Please authenticate.' });
    }
};

// User Routes
app.post('/api/register', async (req, res) => {
    try {
        const { email, password, role } = req.body;
        const hashedPassword = await bcrypt.hash(password, 8);
        const user = new User({ email, password: hashedPassword, role });
        await user.save();
        const token = jwt.sign({ _id: user._id }, 'your_jwt_secret');
        res.status(201).send({ user, token });
    } catch (error) {
        res.status(400).send(error);
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password, role } = req.body;
        const user = await User.findOne({ email });
        if (!user || user.role !== role) {
            return res.status(401).send({ error: 'Invalid credentials' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).send({ error: 'Invalid credentials' });
        }
        const token = jwt.sign({ _id: user._id }, 'your_jwt_secret');
        res.send({ token, role: user.role });
    } catch (error) {
        res.status(400).send(error);
    }
});

// Placement Routes
app.post('/api/placement', auth, upload.single('offerLetter'), async (req, res) => {
    try {
        const placement = new Placement({
            ...req.body,
            offerLetter: req.file.filename,
            userId: req.user._id
        });
        await placement.save();
        res.status(201).send(placement);
    } catch (error) {
        res.status(400).send(error);
    }
});

app.get('/api/placement', auth, async (req, res) => {
    try {
        const query = req.user.role === 'student' ? { userId: req.user._id } : {};
        const placements = await Placement.find(query).sort({ createdAt: -1 });
        res.send(placements);
    } catch (error) {
        res.status(500).send(error);
    }
});

app.get('/api/placement/:id', auth, async (req, res) => {
    try {
        const placement = await Placement.findById(req.params.id);
        if (!placement) {
            return res.status(404).send();
        }
        res.send(placement);
    } catch (error) {
        res.status(500).send(error);
    }
});

// Internship Routes
app.post('/api/internship', auth, upload.single('offerLetter'), async (req, res) => {
    try {
        const internship = new Internship({
            ...req.body,
            offerLetter: req.file.filename,
            userId: req.user._id
        });
        await internship.save();
        res.status(201).send(internship);
    } catch (error) {
        res.status(400).send(error);
    }
});

app.get('/api/internship', auth, async (req, res) => {
    try {
        const query = req.user.role === 'student' ? { userId: req.user._id } : {};
        const internships = await Internship.find(query).sort({ createdAt: -1 });
        res.send(internships);
    } catch (error) {
        res.status(500).send(error);
    }
});

app.get('/api/internship/:id', auth, async (req, res) => {
    try {
        const internship = await Internship.findById(req.params.id);
        if (!internship) {
            return res.status(404).send();
        }
        res.send(internship);
    } catch (error) {
        res.status(500).send(error);
    }
});

// BE Honors Routes
app.post('/api/behonors', auth, upload.single('certificate'), async (req, res) => {
    try {
        const beHonors = new BeHonors({
            ...req.body,
            certificate: req.file.filename,
            userId: req.user._id
        });
        await beHonors.save();
        res.status(201).send(beHonors);
    } catch (error) {
        res.status(400).send(error);
    }
});

app.get('/api/behonors', auth, async (req, res) => {
    try {
        const query = req.user.role === 'student' ? { userId: req.user._id } : {};
        const beHonors = await BeHonors.find(query).sort({ createdAt: -1 });
        res.send(beHonors);
    } catch (error) {
        res.status(500).send(error);
    }
});

app.get('/api/behonors/:id', auth, async (req, res) => {
    try {
        const beHonors = await BeHonors.findById(req.params.id);
        if (!beHonors) {
            return res.status(404).send();
        }
        res.send(beHonors);
    } catch (error) {
        res.status(500).send(error);
    }
});

// Additional Course Routes
app.post('/api/additionalcourse', auth, upload.single('certificate'), async (req, res) => {
    try {
        const additionalCourse = new AdditionalCourse({
            ...req.body,
            certificate: req.file.filename,
            userId: req.user._id
        });
        await additionalCourse.save();
        res.status(201).send(additionalCourse);
    } catch (error) {
        res.status(400).send(error);
    }
});

app.get('/api/additionalcourse', auth, async (req, res) => {
    try {
        const query = req.user.role === 'student' ? { userId: req.user._id } : {};
        const additionalCourses = await AdditionalCourse.find(query).sort({ createdAt: -1 });
        res.send(additionalCourses);
    } catch (error) {
        res.status(500).send(error);
    }
});

app.get('/api/additionalcourse/:id', auth, async (req, res) => {
    try {
        const additionalCourse = await AdditionalCourse.findById(req.params.id);
        if (!additionalCourse) {
            return res.status(404).send();
        }
        res.send(additionalCourse);
    } catch (error) {
        res.status(500).send(error);
    }
});

// Delete routes for admin
app.delete('/api/:type/:id', auth, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).send({ error: 'Only admin can delete records' });
    }

    try {
        let model;
        switch (req.params.type) {
            case 'placement':
                model = Placement;
                break;
            case 'internship':
                model = Internship;
                break;
            case 'behonors':
                model = BeHonors;
                break;
            case 'additionalcourse':
                model = AdditionalCourse;
                break;
            default:
                return res.status(400).send({ error: 'Invalid type' });
        }

        const record = await model.findByIdAndDelete(req.params.id);
        if (!record) {
            return res.status(404).send();
        }
        res.send({ message: 'Record deleted successfully' });
    } catch (error) {
        res.status(500).send(error);
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});