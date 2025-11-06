// FILE: pages/api/sensor.js
// API endpoint untuk menerima data realtime dari ESP32

let latestData = {
  suhu: '-',
  kelembapan: '-',
  co2: '-',
  ip: '-',
  rssi: '-',
  timestamp: null
};

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
      const { suhu, kelembapan, co2, ip, rssi } = req.body;
      
      latestData = {
        suhu: suhu || '-',
        kelembapan: kelembapan || '-',
        co2: co2 || '-',
        ip: ip || '-',
        rssi: rssi || '-',
        timestamp: new Date().toISOString()
      };
      
      console.log('Data received:', latestData);
      
      res.status(200).json({
        success: true,
        message: 'Data received',
        data: latestData
      });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({
        success: false,
        message: 'Error processing data'
      });
    }
  } else if (req.method === 'GET') {
    // Dashboard request data
    // Cek apakah data masih fresh (< 30 detik)
    const now = new Date();
    const dataTime = latestData.timestamp ? new Date(latestData.timestamp) : null;
    const isStale = !dataTime || (now - dataTime) > 30000; // 30 detik
    
    res.status(200).json({
      success: true,
      data: latestData,
      isStale: isStale,
      serverTime: now.toISOString()
    });
  } else {
    res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }
}