const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const Field = require('./models/Field');
const User = require('./models/User');

const app = express();
app.use(cors({
  origin: "https://cropsense-xam6.onrender.com"
}));
app.use(express.json());
// Serve static files from the current directory
app.use(express.static(__dirname));

// Redirect root to index.html (Login Page)
app.get('/', (req, res) => {
    res.redirect('/index.html');
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cropsense_advanced')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// --- API ROUTES --- //

// --- AUTHENTICATION ROUTES --- //
const JWT_SECRET = process.env.JWT_SECRET || 'cropsense_super_secret_key_2026';

// Register User
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        // Check if user exists
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ error: "User already exists with this email" });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        user = new User({ name, email, password: hashedPassword });
        await user.save();

        // Create token
        const token = jwt.sign({ id: user._id, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
        
        res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
    } catch (err) {
        console.error("Register Error:", err.message);
        res.status(500).json({ error: "Server error during registration" });
    }
});

// Login User
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: "Invalid credentials" });

        // Validate password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

        // Create token
        const token = jwt.sign({ id: user._id, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
        
        res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
    } catch (err) {
        console.error("Login Error:", err.message);
        res.status(500).json({ error: "Server error during login" });
    }
});

// --- MIDDLEWARE --- //
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: "Access Denied: No Token Provided!" });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Invalid Token" });
        req.user = user;
        next();
    });
};

app.get('/api/fields', authenticateToken, async (req, res) => {
    try {
        const fields = await Field.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.json(fields);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/fields/:id', authenticateToken, async (req, res) => {
    try {
        const field = await Field.findOne({ _id: req.params.id, userId: req.user.id });
        if (!field) return res.status(404).json({ message: 'Field not found' });
        res.json(field);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/fields', authenticateToken, async (req, res) => {
    try {
        const newField = new Field({ ...req.body, userId: req.user.id });

        // Auto-generate history from plantingDate to Today
        if (newField.plantingDate) {
            const plantingDate = new Date(newField.plantingDate);
            const today = new Date();
            const diffTime = today - plantingDate;
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays > 0 && diffDays <= 365) { // Limit to 1 year max
                let baseTemp = newField.temperature || 25;
                let baseHum = newField.humidity || 60;
                
                newField.history = []; // Clear any default

                for (let i = 0; i <= diffDays; i++) {
                    const logDate = new Date(plantingDate);
                    logDate.setDate(logDate.getDate() + i);
                    
                    // Add realistic daily fluctuations
                    const simTemp = baseTemp + (Math.random() * 6 - 3); // +/- 3 degrees
                    const simHum = baseHum + (Math.random() * 14 - 7); // +/- 7 percent
                    
                    newField.history.push({
                        date: logDate,
                        temperature: Math.round(simTemp * 10) / 10,
                        humidity: Math.round(simHum),
                        soilMoisture: newField.soilMoisture || 'medium',
                        stage: newField.stage
                    });
                }
            }
        }

        const savedField = await newField.save();
        res.status(201).json(savedField);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.post('/api/fields/:id/history', authenticateToken, async (req, res) => {
    try {
        const field = await Field.findOne({ _id: req.params.id, userId: req.user.id });
        if (!field) return res.status(404).json({ message: 'Field not found' });

        const { date, temperature, humidity, soilMoisture } = req.body;
        
        field.history.push({
            date: date ? new Date(date) : new Date(),
            temperature,
            humidity,
            soilMoisture,
            stage: field.stage
        });

        field.temperature = temperature;
        field.humidity = humidity;
        field.soilMoisture = soilMoisture;

        // Auto Gemini Prediction
        if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY_HERE') {
            try {
                const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
                const prompt = `Act as an agricultural predictor. I have a field with crop: ${field.cropType}, area: ${field.area} acres, current stage: ${field.stage}.
The latest daily data: Temp ${temperature}°C, Humidity ${humidity}%, Soil Moisture ${soilMoisture}.
Predict three things based on realistic agricultural data:
1. healthStatus (must be exactly one of: 'Healthy', 'Warning', 'Critical')
2. yieldPrediction (a number in kg, based on average realistic yield per acre)
3. marketValue (estimated total price for that yield in Indian Rupees, formatted like "₹45,000")
Return ONLY a valid JSON object with exactly these 3 keys: healthStatus, yieldPrediction, marketValue. No markdown or backticks.`;

                const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
                let cleanText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
                const predData = JSON.parse(cleanText);
                
                if (predData.healthStatus) field.healthStatus = predData.healthStatus;
                if (predData.yieldPrediction) field.yieldPrediction = predData.yieldPrediction;
                if (predData.marketValue) field.marketValue = predData.marketValue;
            } catch(e) {
                console.error("Auto Prediction failed (Gemini 503/Overload). Using fallback logic.");
                // Fallback Logic so the UI doesn't say "Calculating..." forever
                field.marketValue = "₹" + (field.yieldPrediction * 45).toLocaleString('en-IN');
                if (field.temperature > 35 || field.humidity < 40) {
                    field.healthStatus = 'Warning';
                } else {
                    field.healthStatus = 'Healthy';
                }
            }
        }

        const updatedField = await field.save();
        res.json(updatedField);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.put('/api/fields/:id', authenticateToken, async (req, res) => {
    try {
        const field = await Field.findOne({ _id: req.params.id, userId: req.user.id });
        if (!field) return res.status(404).json({ message: 'Field not found' });

        Object.assign(field, req.body);
        const updatedField = await field.save();
        res.json(updatedField);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// TASK ROUTES //
app.put('/api/fields/:id/tasks/:taskId', authenticateToken, async (req, res) => {
    try {
        const field = await Field.findOne({ _id: req.params.id, userId: req.user.id });
        if (!field) return res.status(404).json({ message: 'Field not found' });

        const task = field.tasks.id(req.params.taskId);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        task.completed = !task.completed;
        await field.save();
        res.json(field);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.post('/api/fields/:id/generate-plan', authenticateToken, async (req, res) => {
    try {
        const field = await Field.findOne({ _id: req.params.id, userId: req.user.id });
        if (!field) return res.status(404).json({ message: 'Field not found' });

        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
            return res.status(400).json({ error: "Gemini API Key missing in .env" });
        }

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        
        const prompt = `Act as an expert agricultural AI. Create a highly accurate crop management schedule for ${field.cropType} (currently in ${field.stage} stage). 
Return exactly a JSON array (no markdown block, just raw JSON).
Format: [{"title": "Apply NPK fertilizer", "category": "fertilizer", "daysFromNow": 5}, {"title": "Irrigation round 2", "category": "irrigation", "daysFromNow": 10}]
Only return 4 to 6 tasks.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });

        // Clean up markdown wrapper if any
        let cleanText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
        const tasksData = JSON.parse(cleanText);

        const newTasks = tasksData.map(t => {
            let dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + (t.daysFromNow || 5));
            return {
                title: t.title,
                category: t.category || 'general',
                dueDate: dueDate,
                completed: false
            };
        });

        field.tasks = newTasks;
        await field.save();
        res.json(field);

    } catch (err) {
        console.error("Gemini Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// AI Chatbot
app.post('/api/ai/chat', authenticateToken, async (req, res) => {
    try {
        const { message, contextId } = req.body;
        let contextData = null;
        
        if (contextId) {
            contextData = await Field.findOne({ _id: contextId, userId: req.user.id });
        }

        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
            return res.json({ reply: "⚠️ Gemini API Key is missing or invalid. Please add it in your .env file." });
        }

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        let prompt = `You are an expert Agricultural AI Advisor called CropSense AI. Be concise but deep.`;
        
        if (contextData) {
            prompt += `\nThe user is asking about their field: "${contextData.name}". Crop: ${contextData.cropType}, Stage: ${contextData.stage}. Current Temp: ${contextData.temperature}°C, Humidity: ${contextData.humidity}%, Soil: ${contextData.soilMoisture}. Predicted Yield: ${contextData.yieldPrediction}kg. Health Status: ${contextData.healthStatus}.\nHere is the history: ${JSON.stringify(contextData.history.slice(-3))}`;
        }
        
        prompt += `\nUser's Query: ${message}`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });

        res.json({ reply: response.text });

    } catch (err) {
        console.error("Gemini Error:", err);
        res.status(500).json({ reply: "⚠️ AI Engine Error: " + err.message });
    }
});

// NDVI & Simulation Insights Endpoint
app.post('/api/ai/ndvi-insights', authenticateToken, async (req, res) => {
    try {
        const { temp, water, rain, fieldData } = req.body;
        
        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
            // Fallback mock data if API key missing
            return res.json({
                alerts: ["High temperature stress detected in Sector B.", "Consider increasing water supply by 15%."],
                growthTrend: "Vegetative phase slowing down due to heat stress.",
                yieldPrediction: "4,800 kg (Reduced by 4% due to simulated heat)",
                confidence: 82
            });
        }

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const prompt = `Act as an advanced Satellite NDVI and AI Agronomy System.
I am running a simulation on a farm.
Simulation Parameters: Temperature ${temp}°C, Water Level ${water}%, Rainfall ${rain}mm.
Crop Context: ${fieldData ? fieldData.cropType : 'Mixed Crops'}, Stage: ${fieldData ? fieldData.stage : 'Growth'}.

Provide exactly a JSON response containing:
1. "alerts": Array of 2 short critical alerts or advice based on these simulation values.
2. "growthTrend": A short 1-sentence analysis of the growth trajectory.
3. "yieldPrediction": Estimated yield formatted as a string (e.g., "5,200 kg").
4. "confidence": A number from 0 to 100 representing AI confidence in this prediction.

Return ONLY the raw JSON without markdown formatting, backticks, or other text.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });

        let cleanText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
        const insights = JSON.parse(cleanText);
        res.json(insights);

    } catch (err) {
        console.error("NDVI Gemini Error:", err.message);
        res.json({
            alerts: ["Error connecting to AI.", "Using baseline models."],
            growthTrend: "Unable to calculate advanced trends.",
            yieldPrediction: "N/A",
            confidence: 50
        });
    }
});

// Update Field Environment Data
app.put('/api/fields/:id/environment', authenticateToken, async (req, res) => {
    try {
        const { temperature, humidity } = req.body;
        const field = await Field.findOne({ _id: req.params.id, userId: req.user.id });
        if(!field) return res.status(404).json({ error: 'Field not found' });
        
        field.temperature = temperature;
        field.humidity = humidity;
        await field.save();
        res.json(field);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});



// Voice Assistant (Kisan AI)
app.post('/api/ai/voice-assistant', authenticateToken, async (req, res) => {
    try {
        const { question, fieldsData } = req.body;
        
        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
            return res.json({ answer: "Sorry, Gemini API key is missing. Please configure it." });
        }

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const prompt = `Act as an expert agricultural assistant (Kisan AI) for the CropSense dashboard. 
The user is asking: "${question}"
Here is their current farm data: ${JSON.stringify(fieldsData)}
Respond in the language the user asked in (Hindi or English). Keep the answer short, conversational, and directly address their data. Don't use markdown or special characters because this will be read out by a text-to-speech engine. Maximum 3 sentences.`;

        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        res.json({ answer: response.text });
    } catch (err) {
        console.error("Voice AI Error:", err.message);
        if (err.message && err.message.includes('429')) return res.json({ answer: "Mafi chahta hu, Gemini API limit (5 requests/minute) poori ho gayi hai. 1 minute baad try karein." });
        res.json({ answer: "Mafi chahta hu, abhi server me kuch dikkat aayi hai." });
    }
});

// Plant Doctor Vision API
app.post('/api/ai/plant-doctor', authenticateToken, async (req, res) => {
    try {
        const { imageBase64 } = req.body;
        
        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
            return res.status(400).json({ error: "Gemini API key is missing." });
        }

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const prompt = "You are an expert plant pathologist. Analyze this crop leaf image. Identify any disease, pest, or nutrient deficiency. If healthy, say so. Keep the response to 3 short bullet points: 1) Diagnosis, 2) Severity, 3) Recommended Pesticide/Action.";

        const imagePart = {
            inlineData: {
                data: imageBase64.split(',')[1],
                mimeType: imageBase64.split(';')[0].split(':')[1]
            }
        };

        const response = await ai.models.generateContent({ 
            model: 'gemini-2.5-flash', 
            contents: [prompt, imagePart] 
        });
        
        res.json({ result: response.text });
    } catch (err) {
        console.error("Vision AI Error:", err.message);
        if (err.message && err.message.includes('429')) return res.json({ error: "Gemini API limit exceeded (5 requests/min). Please wait 1 minute." });
        res.status(500).json({ error: "Failed to analyze image." });
    }
});

// Market Predictor API
app.post('/api/ai/market-predictor', authenticateToken, async (req, res) => {
    try {
        const { cropType } = req.body;
        
        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
            return res.status(400).json({ error: "Gemini API key is missing." });
        }

        // Fetch user's fields to get location context
        const userFields = await Field.find({ userId: req.user.id });
        let locationContext = "various Mandis across India";
        if (userFields.length > 0 && userFields[0].location) {
            const loc = userFields[0].location;
            locationContext = `local Mandis near coordinates (${loc.lat}, ${loc.lng}) and the surrounding state in India`;
        }

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const prompt = `You are an expert agricultural economist specializing in Indian Mandi (market) trends. 
The user is interested in "${cropType}" and is located near ${locationContext}.
Predict the market trend for the next 7 days specifically for this hyper-local region while considering national supply/demand.

Return ONLY a valid JSON object in exactly this format:
{
  "prices": [2200, 2250, 2240, 2300, 2350, 2400, 2380], 
  "recommendation": "SELL",
  "reason": "Detailed reason mentioning specific regional factors or Mandi trends for ${cropType} near the user's location..."
}
The prices array MUST contain exactly 7 realistic price values (in INR per quintal) reflecting current localized rates. The recommendation MUST be "HOLD" or "SELL".`;

        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        let text = response.text;
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("Invalid JSON format from AI: " + text);
        res.json(JSON.parse(jsonMatch[0]));
    } catch (err) {
        console.error("Market AI Error:", err.message);
        if (err.message && err.message.includes('429')) return res.status(429).json({ error: "Gemini Rate Limit (5 req/min). Wait 60s." });
        res.status(500).json({ error: "Server Error: " + err.message });
    }
});

// Daily Action AI
app.get('/api/ai/daily-action', authenticateToken, async (req, res) => {
    try {
        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
            return res.json({ action: "Configure Gemini API key for smart actions.", priority: "Low" });
        }

        const fields = await Field.find({ userId: req.user.id });
        if(fields.length === 0) {
            return res.json({ action: "No fields registered yet. Register a field to get AI actions.", priority: "Low" });
        }

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const prompt = `You are an AI Farm Manager. Here is the data for all the user's fields: ${JSON.stringify(fields)}.
Identify the SINGLE MOST CRITICAL action the farmer needs to take TODAY. 
Keep it very short and punchy (max 15 words).
Format as JSON: {"action": "Water the Wheat field immediately", "priority": "High"}`;

        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        let text = response.text;
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("Invalid JSON format from AI");
        res.json(JSON.parse(jsonMatch[0]));
    } catch (err) {
        console.error("Daily Action AI Error:", err.message);
        if (err.message && err.message.includes('429')) return res.json({ action: "Gemini Rate Limit (5 requests/min). Please wait 1 min.", priority: "Warning" });
        res.json({ action: "All systems normal. Continue routine monitoring.", priority: "Normal" });
    }
});

// Smart Predictive Alerts API (Cached to prevent rate limit)
let cachedAlerts = null;
let lastAlertFetch = 0;

app.get('/api/ai/smart-alerts', authenticateToken, async (req, res) => {
    try {
        if (Date.now() - lastAlertFetch < 5 * 60 * 1000 && cachedAlerts) {
            return res.json(cachedAlerts);
        }

        const fields = await Field.find({ userId: req.user.id });
        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
            return res.json([{ title: "Setup Required", message: "Add Gemini API Key to enable AI alerts.", type: "Info" }]);
        }

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const prompt = `Act as an AI Agronomist. Based on this farm data: ${JSON.stringify(fields)}.
        Generate exactly 3 smart, predictive notifications for the farmer. 
        Examples: "Heavy rain expected tomorrow. Delay pesticide spray in Sector B." or "Wheat prices dropping, sell now." or "Soil moisture is very low in Sector A, start water pump."
        Return ONLY a valid JSON array of objects like this:
        [{"title": "Weather Alert", "message": "Heavy rain expected...", "type": "Warning"}]
        "type" must be exactly one of: Warning, Danger, Success, Info.`;

        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        const jsonMatch = response.text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) throw new Error("Invalid JSON array from AI");
        
        cachedAlerts = JSON.parse(jsonMatch[0]);
        lastAlertFetch = Date.now();
        res.json(cachedAlerts);
    } catch (err) {
        console.error("Smart Alerts AI Error:", err.message);
        if (cachedAlerts) return res.json(cachedAlerts);
        res.json([{ title: "System Monitoring", message: "AI systems are active and monitoring the farm.", type: "Info" }]);
    }
});


// =============================================
// 8TH PAGE FEATURES ROUTES
// =============================================

// Community Alerts store
let communityAlerts = [];

app.get('/api/community/alerts', authenticateToken, async (req, res) => {
    res.json(communityAlerts.slice(-20).reverse());
});

app.post('/api/community/broadcast', authenticateToken, async (req, res) => {
    try {
        const { title, message, severity, location } = req.body;
        const user = await User.findById(req.user.id);
        const alert = {
            id: Date.now(),
            title,
            message,
            severity: severity || 'Warning',
            location: location || 'Unknown Region',
            postedBy: user ? user.name : 'Anonymous Farmer',
            timestamp: new Date().toISOString(),
        };
        communityAlerts.push(alert);
        res.status(201).json(alert);
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/ai/crop-calendar', authenticateToken, async (req, res) => {
    try {
        const { fieldId } = req.body;
        const field = await Field.findOne({ _id: fieldId, userId: req.user.id });
        if (!field) return res.status(404).json({ error: 'Field not found' });
        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
            return res.status(400).json({ error: 'Gemini API key is missing.' });
        }
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const prompt = `You are an expert agronomist. Create a 6-month crop calendar for:
Crop: ${field.cropType}, Area: ${field.area} acres, Stage: ${field.stage}, Planted: ${new Date(field.plantingDate).toDateString()}.
Return ONLY a valid JSON array of exactly 8 milestone events:
[{ "day": 15, "title": "First Irrigation", "description": "Water the field lightly", "category": "Irrigation" }]
Categories must be one of: Irrigation, Fertilizer, Pest Control, Harvesting, Monitoring.
Be specific and realistic for Indian farming.`;
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        const jsonMatch = response.text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) throw new Error('Invalid JSON from AI');
        res.json({ field: { name: field.name, cropType: field.cropType, plantingDate: field.plantingDate }, calendar: JSON.parse(jsonMatch[0]) });
    } catch(err) {
        console.error('Crop Calendar Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/ai/profit-simulator', authenticateToken, async (req, res) => {
    try {
        const { fieldId, alternativeCrop } = req.body;
        const field = await Field.findOne({ _id: fieldId, userId: req.user.id });
        if (!field) return res.status(404).json({ error: 'Field not found' });
        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
            return res.status(400).json({ error: 'Gemini API key is missing.' });
        }
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const area = field.area;
        const prompt = `You are an agricultural financial analyst for India. Compare profitability for ${area} acres:
Current crop: ${field.cropType}, Alternative crop: ${alternativeCrop}.
Return ONLY valid JSON (no markdown):
{
  "current": { "crop": "${field.cropType}", "investmentPerAcre": 15000, "yieldPerAcre": 1800, "pricePerQuintal": 2100, "revenuePerAcre": 37800, "profitPerAcre": 22800, "totalProfit": 45600 },
  "alternative": { "crop": "${alternativeCrop}", "investmentPerAcre": 18000, "yieldPerAcre": 2200, "pricePerQuintal": 2800, "revenuePerAcre": 61600, "profitPerAcre": 43600, "totalProfit": 87200 },
  "verdict": "SWITCH",
  "extraProfitPossible": 41600,
  "analysis": "Two-sentence explanation mentioning market trends and regional factors."
}
All numbers must be realistic. totalProfit = profitPerAcre * ${area}.`;
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        const jsonMatch = response.text.replace(/```json/g,'').replace(/```/g,'').match(/{[\s\S]*}/);
        if (!jsonMatch) throw new Error('Invalid JSON from AI');
        res.json(JSON.parse(jsonMatch[0]));
    } catch(err) {
        console.error('Profit Simulator Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});



// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 CropSense Backend running on http://localhost:${PORT}`);
});
