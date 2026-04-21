const mongoose = require('mongoose');

const fieldSchema = new mongoose.Schema({
    userId: { type: String, required: true, default: 'anonymous' },
    name: { type: String, required: true },
    cropType: { type: String, required: true },
    area: { type: Number, required: true },
    plantingDate: { type: Date, required: true },
    stage: { type: String, default: 'vegetative' },
    temperature: { type: Number, default: 25 },
    humidity: { type: Number, default: 60 },
    soilMoisture: { type: String, default: 'medium' },
    notes: { type: String },
    healthStatus: { type: String, default: 'Healthy' },
    yieldPrediction: { type: Number, default: 0 },
    marketValue: { type: String, default: 'Calculating...' },
    location: {
        lat: { type: Number, default: 28.6139 },
        lng: { type: Number, default: 77.2090 }
    },
    history: [
        {
            date: { type: Date, default: Date.now },
            temperature: Number,
            humidity: Number,
            soilMoisture: String,
            stage: String
        }
    ],
    tasks: [
        {
            title: String,
            category: String,
            dueDate: Date,
            completed: { type: Boolean, default: false }
        }
    ]
}, { timestamps: true });

// Pre-save hook to generate simple predictions
fieldSchema.pre('save', async function() {
    // Advanced algorithm simulation
    let baseYield = 0;
    if (this.cropType === 'wheat') baseYield = 1000 * this.area;
    else if (this.cropType === 'rice') baseYield = 1200 * this.area;
    else if (this.cropType === 'corn') baseYield = 1500 * this.area;
    else baseYield = 800 * this.area;

    // Adjust based on temp and humidity
    let yieldMod = 1.0;
    if (this.temperature > 35) yieldMod -= 0.1;
    if (this.temperature < 15) yieldMod -= 0.15;
    if (this.humidity < 40) yieldMod -= 0.1;
    
    this.yieldPrediction = Math.round(baseYield * yieldMod);

    if (this.temperature > 35 || this.humidity < 40) {
        this.healthStatus = 'Warning';
    } else {
        this.healthStatus = 'Healthy';
    }

    // Add to history automatically if new
    if (this.isNew && this.history.length === 0) {
        this.history.push({
            temperature: this.temperature,
            humidity: this.humidity,
            soilMoisture: this.soilMoisture,
            stage: this.stage
        });
    }
});

module.exports = mongoose.model('Field', fieldSchema);
