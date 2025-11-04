import { useState, useEffect } from 'react';

export default function Dashboard() {
  const [allData, setAllData] = useState([]);
  const [displayData, setDisplayData] = useState([]);
  const [latestData, setLatestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  
  // Filter states
  const [filterDate, setFilterDate] = useState('');
  const [filterStartTime, setFilterStartTime] = useState('');
  const [filterEndTime, setFilterEndTime] = useState('');

  const SPREADSHEET_ID = '1Cl3v9gd8esOjG5CigdGmeFeK_9ik_Llf9LclvS_R03c';
  const SHEET_NAME = 'Sheet1';

  useEffect(() => {
    fetchData();
    // Refresh setiap 5 detik untuk data realtime
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    applyFilters();
  }, [allData, filterDate, filterStartTime, filterEndTime]);

  const parseDate = (dateStr) => {
    if (!dateStr || dateStr === '-') return null;
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const year = parseInt(parts[2]);
      return new Date(year, month, day);
    }
    return null;
  };

  const parseTime = (timeStr) => {
    if (!timeStr || timeStr === '-') return null;
    const parts = timeStr.split(':');
    if (parts.length >= 2) {
      const hours = parseInt(parts[0]);
      const minutes = parseInt(parts[1]);
      const seconds = parts.length > 2 ? parseInt(parts[2]) : 0;
      return hours * 3600 + minutes * 60 + seconds;
    }
    return null;
  };

  const applyFilters = () => {
    let filtered = [...allData];

    if (filterDate) {
      filtered = filtered.filter(row => {
        const rowDate = parseDate(row.tanggal);
        const filterDateObj = new Date(filterDate);
        
        if (!rowDate) return false;
        
        return rowDate.getDate() === filterDateObj.getDate() &&
               rowDate.getMonth() === filterDateObj.getMonth() &&
               rowDate.getFullYear() === filterDateObj.getFullYear();
      });
    }

    if (filterStartTime || filterEndTime) {
      filtered = filtered.filter(row => {
        const rowTime = parseTime(row.waktu);
        if (rowTime === null) return false;

        const startSeconds = filterStartTime ? parseTime(filterStartTime + ':00') : 0;
        const endSeconds = filterEndTime ? parseTime(filterEndTime + ':59') : 86399;

        return rowTime >= startSeconds && rowTime <= endSeconds;
      });
    }

    // Batasi hanya 10 data terbaru untuk riwayat
    const limitedData = filtered.slice(0, 10);
    setDisplayData(limitedData);
  };

  const clearFilters = () => {
    setFilterDate('');
    setFilterStartTime('');
    setFilterEndTime('');
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${SHEET_NAME}`;
      
      const response = await fetch(url);
      const text = await response.text();
      const json = JSON.parse(text.substring(47).slice(0, -2));
      
      if (json.table.rows && json.table.rows.length > 0) {
        const formattedData = json.table.rows.slice(1).reverse().map((row, index) => {
          const dateCell = row.c[0];
          const timeCell = row.c[1];
          const tempCell = row.c[2];
          const humidCell = row.c[3];
          const airQualityCell = row.c[4];
          const ipCell = row.c[5];
          const rssiCell = row.c[6];
          
          return {
            id: index,
            tanggal: dateCell ? (dateCell.f || dateCell.v || '-') : '-',
            waktu: timeCell ? (timeCell.f || timeCell.v || '-') : '-',
            suhu: tempCell?.v || '-',
            kelembapan: humidCell?.v || '-',
            kualitasUdara: airQualityCell?.v || '-',
            ip: ipCell?.v || '-',
            rssi: rssiCell?.v || '-'
          };
        });
        
        setAllData(formattedData);
        setLatestData(formattedData[0] || null);
        setLastUpdate(new Date().toLocaleString('id-ID'));
      } else {
        setAllData([]);
        setLatestData(null);
      }
      
      setLoading(false);
      setError(null);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Gagal mengambil data. Pastikan Google Sheet sudah di-publish dan Spreadsheet ID sudah benar.');
      setLoading(false);
    }
  };

  const getAirQualityStatus = (ppm) => {
    if (ppm === '-') return { text: '-', color: '#999' };
    const value = parseFloat(ppm);
    if (value < 400) return { text: 'Baik', color: '#28a745' };
    if (value < 1000) return { text: 'Sedang', color: '#ffc107' };
    if (value < 2000) return { text: 'Buruk', color: '#fd7e14' };
    return { text: 'Bahaya', color: '#dc3545' };
  };

  const getSignalStatus = (rssi) => {
    if (rssi === '-') return { text: 'Tidak Terhubung', color: '#dc3545', icon: '📡' };
    const value = parseInt(rssi);
    if (value > -50) return { text: 'Excellent', color: '#28a745', icon: '📶' };
    if (value > -60) return { text: 'Good', color: '#28a745', icon: '📶' };
    if (value > -70) return { text: 'Fair', color: '#ffc107', icon: '📶' };
    return { text: 'Weak', color: '#fd7e14', icon: '📶' };
  };

  return (
    <div className="container">
      <div className="header">
        <h1>🌡️ Monitoring Kos Ridho</h1>
        <p className="subtitle">Sistem Pemantauan Suhu, Kelembapan & Kualitas Udara Real-time</p>
      </div>

      {/* Status WiFi ESP32 */}
      {latestData && (
        <div className="wifi-status">
          <div className="wifi-info">
            <span className="wifi-icon">{getSignalStatus(latestData.rssi).icon}</span>
            <div>
              <div className="wifi-label">Status ESP32</div>
              <div className="wifi-value">
                {latestData.ip !== '-' ? (
                  <>
                    <span style={{color: '#28a745'}}>● Terhubung</span>
                    <span className="wifi-detail">IP: {latestData.ip}</span>
                  </>
                ) : (
                  <span style={{color: '#dc3545'}}>● Terputus</span>
                )}
              </div>
            </div>
          </div>
          <div className="wifi-signal">
            <div className="signal-label">Sinyal WiFi</div>
            <div className="signal-value" style={{color: getSignalStatus(latestData.rssi).color}}>
              {latestData.rssi !== '-' ? `${latestData.rssi} dBm` : 'N/A'}
              <span className="signal-status">{getSignalStatus(latestData.rssi).text}</span>
            </div>
          </div>
        </div>
      )}

      {/* Card Data Terkini */}
      <div className="current-data">
        <h2>📊 Data Terkini (Update Setiap 5 Detik)</h2>
        {latestData ? (
          <div className="cards">
            <div className="card temperature">
              <div className="card-icon">🌡️</div>
              <div className="card-content">
                <div className="card-label">Suhu</div>
                <div className="card-value">{latestData.suhu}°C</div>
              </div>
            </div>
            
            <div className="card humidity">
              <div className="card-icon">💧</div>
              <div className="card-content">
                <div className="card-label">Kelembapan</div>
                <div className="card-value">{latestData.kelembapan}%</div>
              </div>
            </div>
            
            <div className="card airquality">
              <div className="card-icon">🌫️</div>
              <div className="card-content">
                <div className="card-label">Kualitas Udara</div>
                <div className="card-value">{latestData.kualitasUdara} PPM</div>
                <div className="card-status" style={{color: getAirQualityStatus(latestData.kualitasUdara).color}}>
                  {getAirQualityStatus(latestData.kualitasUdara).text}
                </div>
              </div>
            </div>
            
            <div className="card time">
              <div className="card-icon">🕐</div>
              <div className="card-content">
                <div className="card-label">Waktu Update</div>
                <div className="card-value small">{latestData.waktu}</div>
                <div className="card-date">{latestData.tanggal}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="no-data-card">
            <p>⏳ Menunggu data dari sensor...</p>
          </div>
        )}
      </div>

      {/* Filter Section */}
      <div className="filter-section">
        <h3>🔍 Filter Data</h3>
        <div className="filter-controls">
          <div className="filter-group">
            <label>Tanggal:</label>
            <input 
              type="date" 
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="filter-input"
            />
          </div>
          
          <div className="filter-group">
            <label>Waktu Mulai:</label>
            <input 
              type="time" 
              value={filterStartTime}
              onChange={(e) => setFilterStartTime(e.target.value)}
              className="filter-input"
            />
          </div>
          
          <div className="filter-group">
            <label>Waktu Akhir:</label>
            <input 
              type="time" 
              value={filterEndTime}
              onChange={(e) => setFilterEndTime(e.target.value)}
              className="filter-input"
            />
          </div>
          
          <button onClick={clearFilters} className="clear-btn">
            ✖️ Hapus Filter
          </button>
        </div>
        
        {(filterDate || filterStartTime || filterEndTime) && (
          <div className="filter-info">
            📊 Menampilkan {displayData.length} dari {allData.length} data
          </div>
        )}
      </div>

      {/* Tabel Riwayat Data - Maksimal 10 */}
      <div className="history-section">
        <div className="section-header">
          <h2>📜 10 Data Terbaru</h2>
          <button onClick={fetchData} className="refresh-btn" disabled={loading}>
            {loading ? '⏳ Loading...' : '🔄 Refresh'}
          </button>
        </div>
        
        {lastUpdate && (
          <p className="last-update">Terakhir diperbarui: {lastUpdate}</p>
        )}

        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        {loading && allData.length === 0 ? (
          <div className="loading">Memuat data...</div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Tanggal</th>
                  <th>Waktu</th>
                  <th>Suhu (°C)</th>
                  <th>Kelembapan (%)</th>
                  <th>Kualitas Udara (PPM)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {displayData.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="no-data">
                      {(filterDate || filterStartTime || filterEndTime) 
                        ? '🔍 Tidak ada data yang sesuai dengan filter'
                        : 'Belum ada data tersimpan'}
                    </td>
                  </tr>
                ) : (
                  displayData.map((row, index) => {
                    const airStatus = getAirQualityStatus(row.kualitasUdara);
                    return (
                      <tr key={row.id}>
                        <td>{index + 1}</td>
                        <td>{row.tanggal}</td>
                        <td>{row.waktu}</td>
                        <td className="temp-value">{row.suhu}</td>
                        <td className="humid-value">{row.kelembapan}</td>
                        <td className="air-value">{row.kualitasUdara}</td>
                        <td>
                          <span className="status-badge" style={{backgroundColor: airStatus.color}}>
                            {airStatus.text}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <footer className="footer">
        <p>💡 Dashboard refresh otomatis setiap 5 detik | Riwayat menampilkan 10 data terbaru</p>
      </footer>

      <style jsx>{`
        .container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
        }

        .header {
          text-align: center;
          color: white;
          margin-bottom: 30px;
          padding: 30px 0;
        }

        .header h1 {
          font-size: 2.5rem;
          margin: 0;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
        }

        .subtitle {
          font-size: 1.1rem;
          opacity: 0.9;
          margin-top: 10px;
        }

        .wifi-status {
          background: white;
          border-radius: 15px;
          padding: 20px 30px;
          margin-bottom: 20px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 20px;
        }

        .wifi-info {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .wifi-icon {
          font-size: 2.5rem;
        }

        .wifi-label {
          font-size: 0.85rem;
          color: #666;
          margin-bottom: 5px;
        }

        .wifi-value {
          font-size: 1.1rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .wifi-detail {
          font-size: 0.9rem;
          color: #666;
          font-weight: normal;
        }

        .wifi-signal {
          text-align: right;
        }

        .signal-label {
          font-size: 0.85rem;
          color: #666;
          margin-bottom: 5px;
        }

        .signal-value {
          font-size: 1.3rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .signal-status {
          font-size: 0.85rem;
          opacity: 0.8;
        }

        .current-data {
          background: white;
          border-radius: 15px;
          padding: 30px;
          margin-bottom: 30px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }

        .current-data h2 {
          margin-top: 0;
          color: #333;
          font-size: 1.5rem;
          margin-bottom: 20px;
        }

        .no-data-card {
          text-align: center;
          padding: 40px;
          color: #666;
          background: #f8f9fa;
          border-radius: 12px;
        }

        .no-data-card p {
          margin: 0;
          font-size: 1.1rem;
        }

        .cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
        }

        .card {
          padding: 25px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 20px;
          transition: transform 0.2s;
        }

        .card:hover {
          transform: translateY(-5px);
        }

        .card.temperature {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .card.humidity {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          color: white;
        }

        .card.airquality {
          background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
          color: white;
        }

        .card.time {
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
          color: white;
        }

        .card-icon {
          font-size: 3rem;
        }

        .card-content {
          flex: 1;
        }

        .card-label {
          font-size: 0.9rem;
          opacity: 0.9;
          margin-bottom: 5px;
        }

        .card-value {
          font-size: 2rem;
          font-weight: bold;
        }

        .card-value.small {
          font-size: 1.5rem;
        }

        .card-date {
          font-size: 0.9rem;
          opacity: 0.8;
          margin-top: 5px;
        }

        .card-status {
          font-size: 1rem;
          font-weight: 600;
          margin-top: 5px;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.2);
        }

        .filter-section {
          background: white;
          border-radius: 15px;
          padding: 25px;
          margin-bottom: 30px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }

        .filter-section h3 {
          margin-top: 0;
          margin-bottom: 20px;
          color: #333;
          font-size: 1.3rem;
        }

        .filter-controls {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          align-items: end;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .filter-group label {
          font-size: 0.9rem;
          color: #555;
          font-weight: 600;
        }

        .filter-input {
          padding: 10px 12px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 1rem;
          transition: all 0.3s;
        }

        .filter-input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .clear-btn {
          background: #f5576c;
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.95rem;
          font-weight: 600;
          transition: all 0.3s;
          white-space: nowrap;
        }

        .clear-btn:hover {
          background: #e04657;
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(245, 87, 108, 0.3);
        }

        .filter-info {
          margin-top: 15px;
          padding: 12px 15px;
          background: #f0f7ff;
          border-left: 4px solid #667eea;
          border-radius: 6px;
          color: #333;
          font-size: 0.95rem;
          font-weight: 500;
        }

        .history-section {
          background: white;
          border-radius: 15px;
          padding: 30px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          margin-bottom: 20px;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 15px;
        }

        .section-header h2 {
          margin: 0;
          color: #333;
          font-size: 1.5rem;
        }

        .refresh-btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 600;
          transition: all 0.3s;
        }

        .refresh-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }

        .refresh-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .last-update {
          color: #666;
          font-size: 0.9rem;
          margin-bottom: 20px;
        }

        .error-message {
          background: #fee;
          border: 1px solid #fcc;
          color: #c33;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .loading {
          text-align: center;
          padding: 40px;
          color: #666;
          font-size: 1.1rem;
        }

        .table-container {
          overflow-x: auto;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
        }

        .data-table th {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 15px;
          text-align: left;
          font-weight: 600;
        }

        .data-table th:first-child {
          border-radius: 8px 0 0 0;
        }

        .data-table th:last-child {
          border-radius: 0 8px 0 0;
        }

        .data-table td {
          padding: 15px;
          border-bottom: 1px solid #eee;
        }

        .data-table tr:hover {
          background: #f8f9fa;
        }

        .data-table tr:last-child td {
          border-bottom: none;
        }

        .temp-value {
          color: #667eea;
          font-weight: 600;
        }

        .humid-value {
          color: #f5576c;
          font-weight: 600;
        }

        .air-value {
          color: #38f9d7;
          font-weight: 600;
        }

        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          color: white;
          font-size: 0.85rem;
          font-weight: 600;
        }

        .no-data {
          text-align: center;
          color: #999;
          padding: 40px !important;
        }

        .footer {
          text-align: center;
          color: white;
          padding: 20px;
          opacity: 0.8;
        }

        .footer p {
          margin: 0;
        }

        @media (max-width: 768px) {
          .container {
            padding: 15px;
          }

          .header h1 {
            font-size: 1.8rem;
          }

          .wifi-status {
            flex-direction: column;
            align-items: flex-start;
          }

          .wifi-signal {
            text-align: left;
          }

          .cards {
            grid-template-columns: 1fr;
          }

          .card {
            padding: 20px;
          }

          .card-icon {
            font-size: 2.5rem;
          }

          .card-value {
            font-size: 1.5rem;
          }

          .filter-controls {
            grid-template-columns: 1fr;
          }

          .section-header {
            flex-direction: column;
            align-items: stretch;
          }

          .refresh-btn {
            width: 100%;
          }

          .data-table {
            font-size: 0.9rem;
          }

          .data-table th,
          .data-table td {
            padding: 10px;
          }
        }
      `}</style>
    </div>
  );
}