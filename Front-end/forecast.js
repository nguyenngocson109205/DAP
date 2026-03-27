// ==========================================
// CẤU HÌNH API
// ==========================================
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

        // Nối điểm hiện tại
        let lastKnownPm25 = actualPM25[actualPM25.length - 1];
        predictPM25[predictPM25.length - 1] = lastKnownPm25;

        // ---------------------------------------------------------
        // BƯỚC 2: GỌI API DỰ BÁO
        // ---------------------------------------------------------
        console.log(`⏳ Đang chạy Model ${modelType.toUpperCase()}...`);
        statusBadge.innerText = `Đang chạy Model ${modelType.toUpperCase()}...`;

        const predRes = await fetch(`${API_BASE_URL}/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ modelType: modelType })
        });

        if (!predRes.ok) throw new Error("Lỗi khi dự báo");
        const predData = await predRes.json();
        const predictedArray = predData.prediction;

        // ---------------------------------------------------------
        // BƯỚC 3: RÁP KẾT QUẢ VÀO MẢNG ĐỂ VẼ
        // ---------------------------------------------------------
        for (let i = 0; i < futureData.length; i++) {
            const date = new Date(futureData[i].time);
            labels.push(`+${i + 1}h (${date.getHours()}h)`);
            actualPM25.push(null);

            let val = predictedArray && predictedArray[i] !== undefined ? predictedArray[i] : 0;
            predictPM25.push(val);
        }

        console.log("✅ Xong dự báo:", predictedArray);

        // --- TÍNH MAX PM2.5 CHO CHUẨN WHO ---
        const maxPredictedPM25 = predictedArray && predictedArray.length > 0 ? Math.max(...predictedArray) : 0;

        // ---------------------------------------------------------
        // BƯỚC 4: VẼ BIỂU ĐỒ VÀ CẬP NHẬT UI
        // ---------------------------------------------------------
        renderChart(labels, actualPM25, predictPM25, modelType);

        // TRUYỀN BIẾN XUỐNG ĐÂY
        updateMetrics(modelType, maxPredictedPM25);

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
// HÀM CẬP NHẬT CHỈ SỐ UI & INSIGHT WHO
// ==========================================
function updateMetrics(modelType, maxPM25 = 0) {
    const metrics = {
        'ridge': { rmse: 2.74, mae: 1.94, r2: 0.95, insight: "Mô hình Ridge tuyến tính chạy ổn định." },
        'xgboost': { rmse: 3.12, mae: 2.26, r2: 0.94, insight: "XGBoost phản ứng nhanh với sự thay đổi của thời tiết." }
    };

    const m = metrics[modelType] || metrics['xgboost'];

    // Cập nhật các con số
    document.getElementById('valRMSE').innerText = m.rmse.toFixed(2);
    document.getElementById('valMAE').innerText = m.mae.toFixed(2);
    document.getElementById('valR2').innerText = m.r2.toFixed(2);

    // Xử lý logic cảnh báo WHO
    let whoAlertHtml = '';
    const whoThreshold = 15;

    if (maxPM25 > whoThreshold) {
        whoAlertHtml = `
            <span class="text-danger fw-bold"><i class="bi bi-exclamation-triangle-fill"></i> CẢNH BÁO WHO:</span> 
            Max PM2.5 đạt <strong>${maxPM25.toFixed(1)} µg/m³</strong>. Vượt mức an toàn, khuyến cáo đeo khẩu trang!`;
    } else if (maxPM25 > 0) {
        whoAlertHtml = `
            <span class="text-success fw-bold"><i class="bi bi-check-circle-fill"></i> CHUẨN WHO:</span> 
            Max PM2.5 đạt <strong>${maxPM25.toFixed(1)} µg/m³</strong>. Không khí rất tốt, lý tưởng để ra ngoài!`;
    } else {
        whoAlertHtml = `<span class="text-muted">Đang chờ dữ liệu dự báo...</span>`;
    }

    // Đổ vào ô Insight
    const insightEl = document.getElementById('aiInsight');
    if (insightEl) {
        insightEl.innerHTML = `
            <div class="mb-1 text-dark">${m.insight}</div>
            <div style="font-size: 0.85rem; margin-top: 8px; border-top: 1px dashed #ccc; padding-top: 8px;">
                ${whoAlertHtml}
            </div>
        `;
    }
}

// ==========================================
// LẮNG NGHE SỰ KIỆN
// ==========================================
document.getElementById('btnRunPrediction').addEventListener('click', () => {
    const model = document.getElementById('modelSelector').value;
    runPredictionProcess(model, 3);
});