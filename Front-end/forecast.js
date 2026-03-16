let aiChartInstance = null;

// Hàm tạo dữ liệu giả lập (Mockup data) để test giao diện
// Tới lúc nối backend Python, bạn chỉ cần thay hàm này bằng lệnh fetch() là xong
function generateDummyData(horizon, modelType) {
    const labels = [];
    const actualData = [];
    const predictData = [];

    // Tạo data quá khứ (24h trước)
    for (let i = -24; i <= 0; i++) {
        labels.push(i === 0 ? 'Hiện tại' : `${Math.abs(i)}h trước`);
        let val = 30 + Math.sin(i / 4) * 15 + Math.random() * 5;
        actualData.push(val);
        predictData.push(null); // Quá khứ thì không vẽ đường dự báo
    }

    // Nối điểm hiện tại để đường vẽ không bị đứt quãng
    predictData[24] = actualData[24];

    // Tạo data tương lai (theo horizon 24h hoặc 48h)
    let lastVal = actualData[24];
    for (let i = 1; i <= horizon; i++) {
        labels.push(`+${i}h`);
        actualData.push(null); // Tương lai thì không có data thực tế

        // Tạo nhiễu tùy theo model (LSTM xịn hơn thì đường mượt hơn XGBoost)
        let noise = modelType === 'lstm' ? (Math.random() * 3) : (Math.random() * 8 - 2);
        let predVal = lastVal + Math.sin(i / 5) * 10 + noise;
        predictData.push(predVal);
    }

    return { labels, actualData, predictData };
}

function renderAIChart(modelType, horizon) {
    const ctx = document.getElementById('aiForecastChart').getContext('2d');

    // Cập nhật trạng thái
    document.getElementById('statusBadge').innerText = 'Đang tính toán...';
    document.getElementById('statusBadge').className = 'badge bg-warning text-dark border rounded-pill px-3';

    // Giả lập thời gian delay của AI (800ms) cho chân thực
    setTimeout(() => {
        const data = generateDummyData(horizon, modelType);

        if (aiChartInstance) aiChartInstance.destroy();

        // Cài đặt màu sắc theo model
        const predColor = modelType === 'lstm' ? '#6610f2' : (modelType === 'gru' ? '#20c997' : '#fd7e14');
        const modelName = document.getElementById('modelSelector').options[document.getElementById('modelSelector').selectedIndex].text;

        aiChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'Dữ liệu Thực tế (Past)',
                        data: data.actualData,
                        borderColor: '#adb5bd',
                        backgroundColor: 'rgba(173, 181, 189, 0.2)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: true,
                        pointRadius: 0 // Ẩn các chấm cho mượt
                    },
                    {
                        label: `Dự báo ${modelName} (Future)`,
                        data: data.predictData,
                        borderColor: predColor,
                        backgroundColor: 'rgba(102, 16, 242, 0.1)', // Vùng mờ (Confidence Interval)
                        borderWidth: 3,
                        borderDash: [5, 5], // Đường đứt nét thể hiện tương lai
                        tension: 0.4,
                        fill: true,
                        pointBackgroundColor: '#fff',
                        pointBorderColor: predColor,
                        pointRadius: 3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: { position: 'top', labels: { font: { size: 14, weight: 'bold' } } },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleFont: { size: 14 },
                        bodyFont: { size: 14, weight: 'bold' },
                        padding: 12
                    }
                },
                scales: {
                    x: { grid: { display: false } },
                    y: {
                        beginAtZero: true,
                        grid: { borderDash: [2, 4], color: '#e9ecef' },
                        title: { display: true, text: 'Nồng độ PM2.5 (µg/m³)' }
                    }
                }
            }
        });

        // Đổi màu thẻ Metric theo Model
        document.querySelectorAll('.metric-card').forEach(card => {
            card.style.borderColor = predColor;
        });

        // Fake data cho các chỉ số đánh giá để nhìn cho Pro
        document.getElementById('valRMSE').innerText = (Math.random() * 2 + 2).toFixed(2);
        document.getElementById('valMAE').innerText = (Math.random() * 1 + 1.5).toFixed(2);
        document.getElementById('valR2').innerText = '0.' + Math.floor(Math.random() * 10 + 85); // 0.85 -> 0.95

        document.getElementById('statusBadge').innerText = 'Dự báo hoàn tất ✓';
        document.getElementById('statusBadge').className = 'badge bg-success-subtle text-success border border-success-subtle rounded-pill px-3';

    }, 800);
}

// Lắng nghe sự kiện click nút Chạy Model
document.getElementById('btnRunPrediction').addEventListener('click', () => {
    const model = document.getElementById('modelSelector').value;
    const horizon = parseInt(document.getElementById('horizonSelector').value);
    renderAIChart(model, horizon);
});

// Chạy lần đầu khi vừa mở trang
document.addEventListener('DOMContentLoaded', () => {
    renderAIChart('lstm', 24);
});