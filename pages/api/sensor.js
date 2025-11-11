// FILE: pages/api/sensor.js
// API endpoint untuk menerima data realtime dari ESP32 + Error Logging

let latestData = {
  suhu: '-',
  kelembapan: '-',
  co2: '-',
  ispu: '-',
  status: '-',
  ip: '-',
  rssi: '-',
  timestamp: null,
  uptime: 0
};

// Simpan 50 log terbaru
const maxLogs = 50;
let errorLogs = [];
let successLogs = [];

export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method === 'POST') {
    // Terima data dari ESP32
    try {
      const { suhu, kelembapan, co2, ispu, status, ip, rssi, timestamp, uptime } = req.body;
      
      const now = new Date();
      
      latestData = {
        suhu: suhu || '-',
        kelembapan: kelembapan || '-',
        co2: co2 || '-',
        ispu: ispu || '-',
        status: status || '-',
        ip: ip || '-',
        rssi: rssi || '-',
        timestamp: timestamp || now.toISOString(),
        uptime: uptime || 0,
        receivedAt: now.toISOString()
      };
      
      // Log sukses
      successLogs.unshift({
        time: now.toLocaleString('id-ID'),
        message: `Data diterima: CO2=${co2} ppm, ISPU=${ispu}`,
        type: 'success',
        data: latestData
      });
      
      // Batasi log
      if (successLogs.length > maxLogs) {
        successLogs = successLogs.slice(0, maxLogs);
      }
      
      console.log('✅ Data received:', latestData);
      
      res.status(200).json({
        success: true,
        message: 'Data received',
        data: latestData
      });
    } catch (error) {
      console.error('❌ Error:', error);
      
      // Log error
      const now = new Date();
      errorLogs.unshift({
        time: now.toLocaleString('id-ID'),
        message: `Error processing data: ${error.message}`,
        type: 'error',
        stack: error.stack
      });
      
      if (errorLogs.length > maxLogs) {
        errorLogs = errorLogs.slice(0, maxLogs);
      }
      
      res.status(500).json({
        success: false,
        message: 'Error processing data',
        error: error.message
      });
    }
  } else if (req.method === 'GET') {
    const { action } = req.query;
    
    // Endpoint untuk mengambil logs
    if (action === 'logs') {
      const now = new Date();
      const dataTime = latestData.timestamp ? new Date(latestData.timestamp) : null;
      const isStale = !dataTime || (now - dataTime) > 30000; // 30 detik
      
      res.status(200).json({
        success: true,
        latestData: latestData,
        isStale: isStale,
        logs: {
          success: successLogs.slice(0, 20), // 20 log sukses terbaru
          error: errorLogs.slice(0, 20), // 20 error terbaru
          total: {
            success: successLogs.length,
            error: errorLogs.length
          }
        },
        serverTime: now.toISOString()
      });
    } else {
      // Dashboard request data biasa
      const now = new Date();
      const dataTime = latestData.timestamp ? new Date(latestData.timestamp) : null;
      const isStale = !dataTime || (now - dataTime) > 30000;
      
      res.status(200).json({
        success: true,
        data: latestData,
        isStale: isStale,
        serverTime: now.toISOString()
      });
    }
  } else {
    res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }
}