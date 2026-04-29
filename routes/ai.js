const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const Shipment = require('../models/Shipment');
const Handoff = require('../models/Handoff');

router.post('/predict', async (req, res) => {
  try {
    const { handoffId, features: directFeatures } = req.body;
    let features = directFeatures;

    if (!features && handoffId) {
      // Try to find in DB if features not provided
      const handoff = await Handoff.findById(handoffId);
      if (handoff) {
        const shipment = await Shipment.findOne({ shipmentId: handoff.shipmentId });
        if (shipment) {
          features = {
            vegetable_type: (shipment.goodsType || 'tomato').toLowerCase(),
            storage_condition: 'ambient',
            packaging_type: 'loose',
            storage_temp_c: handoff.temperature,
            temp_deviation_c: Math.abs(handoff.temperature - (shipment.temperatureThreshold || 20)),
            humidity_pct: 70.0,
            damage_score: 1.0,
            microbial_load_log_cfu: 2.0,
            ethylene_ppm: 1.0
          };
        }
      }
    }

    if (!features) {
      return res.status(400).json({ message: 'No features or valid handoff ID provided' });
    }

    const pythonProcess = spawn('python3', [path.join(__dirname, '../predict_spoilage.py')]);
    
    let resultData = '';
    let errorData = '';

    pythonProcess.stdout.on('data', (data) => {
      resultData += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('Python process failed:', errorData);
        return res.status(500).json({ error: 'AI Prediction failed', details: errorData });
      }
      try {
        const prediction = JSON.parse(resultData);
        res.json(prediction);
      } catch (e) {
        res.status(500).json({ error: 'Failed to parse AI output' });
      }
    });

    // Send features to Python script via stdin
    pythonProcess.stdin.write(JSON.stringify(features) + '\n');
    pythonProcess.stdin.end();

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
