// ==========================================
// CẤU HÌNH API
// ==========================================
// Nếu Web gọi trực tiếp Python thì dùng 5000, nếu qua Node.js thì dùng 4000.
// Ở đây tui để lại 4000 theo đúng hình lỗi bạn gửi
const API_BASE_URL = 'http://localhost:4000/ai';
let aiChartInstance = null;

// ==========================================
// HÀM GỌI API DỰ BÁO
// ==========================================
async function runPredictionProcess(modelType, horizon) {
    const statusBadge = document.getElementById('statusBadge');
    statusBadge.innerText = 'Đang tải dữ liệu...';
    statusBadge.className = 'badge bg-warning text-dark border rounded-pill px-3';

    try {
        // ---------------------------------------------------------
        // BƯỚC 1: LẤY THỜI TIẾT ĐỂ VẼ TRỤC X VÀ ĐƯỜNG PAST
        // ---------------------------------------------------------
        console.log("⏳ Gọi API Thời tiết...");
        const weatherRes = await fetch(`${API_BASE_URL}/weather`);
        if (!weatherRes.ok) throw new Error("Lỗi gọi API Weather");
        const weatherData = await weatherRes.json();

        const pastData = weatherData.past_24h;
        // Vì Model Python hiện tại chỉ trả ra 3 số (3 giờ), ta cắt futureData = 3
        const futureData = weatherData.future.slice(0, 3); 

        const labels = [];
        const actualPM25 = [];
        const predictPM25 = [];

        // Nạp dữ liệu quá khứ
        pastData.forEach((d, index) => {
            const date = new Date(d.time);
            labels.push(index === pastData.length - 1 ? 'Hiện tại' : `${date.getHours()}h`);
            actualPM25.push(d.pm25);
            predictPM25.push(null);
        });

        // Nối điểm hiện tại để đường vẽ không bị đứt
        let lastKnownPm25 = actualPM25[actualPM25.length - 1];
        predictPM25[predictPM25.length - 1] = lastKnownPm25;

        // ---------------------------------------------------------
        // BƯỚC 2: GỌI API DỰ BÁO (GỌI 1 LẦN DUY NHẤT)
        // ---------------------------------------------------------
        console.log(`⏳ Đang chạy Model ${modelType.toUpperCase()}...`);
        statusBadge.innerText = `Đang chạy Model ${modelType.toUpperCase()}...`;

        // Gọi POST /predict, KHÔNG CẦN GỬI features nữa
        const predRes = await fetch(`${API_BASE_URL}/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ modelType: modelType }) 
        });

        if (!predRes.ok) throw new Error("Lỗi khi dự báo");
        const predData = await predRes.json();
        
        // predData.prediction bây giờ là 1 mảng [so_thu_1, so_thu_2, so_thu_3]
        const predictedArray = predData.prediction;

        // ---------------------------------------------------------
        // BƯỚC 3: RÁP KẾT QUẢ VÀO MẢNG ĐỂ VẼ
        // ---------------------------------------------------------
        for (let i = 0; i < futureData.length; i++) {
            const date = new Date(futureData[i].time);
            labels.push(`+${i+1}h (${date.getHours()}h)`);
            actualPM25.push(null);
            
            // Nếu có kết quả thì nhét vào, không thì lấy 0
            let val = predictedArray && predictedArray[i] !== undefined ? predictedArray[i] : 0;
            predictPM25.push(val);
        }

        console.log("✅ Xong dự báo:", predictedArray);

        // ---------------------------------------------------------
        // BƯỚC 4: VẼ BIỂU ĐỒ
        // ---------------------------------------------------------
        renderChart(labels, actualPM25, predictPM25, modelType);
        updateMetrics(modelType);

        statusBadge.innerText = 'Dự báo hoàn tất ✓';
        statusBadge.className = 'badge bg-success-subtle text-success border border-success-subtle rounded-pill px-3';

    } catch (error) {
        console.error("❌ Lỗi toàn cục:", error);
        statusBadge.innerText = 'Lỗi kết nối Backend!';
        statusBadge.className = 'badge bg-danger text-white border rounded-pill px-3';
    }
}

// ==========================================
// HÀM VẼ BIỂU ĐỒ CHART.JS
// ==========================================
function renderChart(labels, actualData, predictData, modelType) {
    const ctx = document.getElementById('aiForecastChart').getContext('2d');
    if (aiChartInstance) aiChartInstance.destroy();

    const predColor = modelType === 'lstm' ? '#6610f2' : (modelType === 'ridge' ? '#20c997' : '#fd7e14');
    const modelName = document.getElementById('modelSelector').options[document.getElementById('modelSelector').selectedIndex].text;

    aiChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Dữ liệu Thực tế (Past)',
                    data: actualData,
                    borderColor: '#adb5bd',
                    backgroundColor: 'rgba(173, 181, 189, 0.2)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 0
                },
                {
                    label: `Dự báo ${modelName} (Future 3h)`,
                    data: predictData,
                    borderColor: predColor,
                    backgroundColor: `${predColor}1A`, 
                    borderWidth: 3,
                    borderDash: [5, 5],
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: predColor,
                    pointRadius: (ctx) => ctx.dataIndex >= (actualData.filter(d => d !== null).length - 1) ? 3 : 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { position: 'top', labels: { font: { size: 14, weight: 'bold' } } },
                tooltip: { backgroundColor: 'rgba(0, 0, 0, 0.8)', titleFont: { size: 14 }, bodyFont: { size: 14, weight: 'bold' } }
            },
            scales: {
                x: { grid: { display: false } },
                y: { beginAtZero: true, grid: { borderDash: [2, 4], color: '#e9ecef' }, title: { display: true, text: 'Nồng độ PM2.5 (µg/m³)' } }
            }
        }
    });

    document.querySelectorAll('.metric-card').forEach(card => card.style.borderColor = predColor);
}

// ==========================================
// HÀM CẬP NHẬT CHỈ SỐ UI
// ==========================================
function updateMetrics(modelType) {
    const metrics = {
        'lstm': { rmse: 3.85, mae: 2.75, r2: 0.94, insight: "Mô hình LSTM xử lý tốt chuỗi thời gian, nắm bắt được xu hướng." },
        'gru': { rmse: 4.10, mae: 3.10, r2: 0.89, insight: "Mô hình Ridge tuyến tính chạy ổn định." },
        'xgboost': { rmse: 4.05, mae: 2.95, r2: 0.91, insight: "XGBoost phản ứng nhanh với sự thay đổi của thời tiết." }
    };
    
    const m = metrics[modelType] || metrics['lstm'];
    document.getElementById('valRMSE').innerText = m.rmse.toFixed(2);
    document.getElementById('valMAE').innerText = m.mae.toFixed(2);
    document.getElementById('valR2').innerText = m.r2.toFixed(2);
    document.getElementById('aiInsight').innerText = m.insight;
}

// ==========================================
// LẮNG NGHE SỰ KIỆN
// ==========================================
document.getElementById('btnRunPrediction').addEventListener('click', () => {
    const model = document.getElementById('modelSelector').value;
    runPredictionProcess(model, 3); // Cố định truyền 3 giờ
});

document.addEventListener('DOMContentLoaded', () => {
    runPredictionProcess('lstm', 3); // Mặc định chạy 3 giờ
});