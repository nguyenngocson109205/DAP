/* =========================================
   PHẦN 1: CHATBOT LOGIC
   ========================================= */
function toggleChat() {
    const chatWindow = document.getElementById('chatWindow');
    if (chatWindow.style.display === 'none' || chatWindow.style.display === '') {
        chatWindow.style.display = 'flex';
        document.getElementById('userInput').focus();
    } else {
        chatWindow.style.display = 'none';
    }
}

function handleEnter(e) {
    if (e.key === 'Enter') sendMessage();
}

async function sendMessage() {
    const inputField = document.getElementById('userInput');
    const message = inputField.value.trim();
    const chatBox = document.getElementById('chatMessages');

    if (message === "") return;

    chatBox.innerHTML += `<div class="message user">${message}</div>`;
    inputField.value = '';
    chatBox.scrollTop = chatBox.scrollHeight;

    const loadingId = 'loading-' + Date.now();
    chatBox.innerHTML += `<div class="message bot" id="${loadingId}">...</div>`;

    try {
        const response = await fetch('http://127.0.0.1:5000/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: message })
        });
        const data = await response.json();
        document.getElementById(loadingId).remove();

        if (data.reply) {
            chatBox.innerHTML += `<div class="message bot">${data.reply}</div>`;
        } else {
            chatBox.innerHTML += `<div class="message bot text-danger">Lỗi format server</div>`;
        }
    } catch (error) {
        if (document.getElementById(loadingId)) document.getElementById(loadingId).remove();
        chatBox.innerHTML += `<div class="message bot text-danger">Mất kết nối server!</div>`;
    }
    chatBox.scrollTop = chatBox.scrollHeight;
}

/* =========================================
   PHẦN 2: AI FORECAST LOGIC (ĐÃ KẾT NỐI API THẬT)
   ========================================= */

let predictionChartInstance = null;

// Hàm chạy dự báo (Gọi API Python)
async function runPrediction() {
    const modelSelect = document.getElementById('modelSelect');
    const modelType = modelSelect ? modelSelect.value : 'gru';

    // 1. Hiển thị trạng thái đang tải
    const trendEl = document.getElementById('predTrend');
    if (trendEl) {
        trendEl.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Đang tính toán...';
        trendEl.className = "badge bg-warning text-dark px-3 py-2 rounded-pill";
    }

    try {
        // 2. GỌI API BACKEND (Cái mà bạn vừa viết xong)
        const response = await fetch('http://127.0.0.1:5000/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: modelType })
        });

        const data = await response.json();

        if (data.error) {
            alert("Lỗi từ Server: " + data.error);
            return;
        }

        // 3. LẤY DỮ LIỆU THẬT TỪ AI
        const predictedData = data.prediction; // Mảng 24 số thực
        const labels = Array.from({ length: 24 }, (_, i) => `${i + 1}h`);

        // 4. CẬP NHẬT GIAO DIỆN
        const maxVal = Math.max(...predictedData);
        const minVal = Math.min(...predictedData);

        document.getElementById('predMax').innerText = `$${maxVal.toFixed(1)}K`;
        document.getElementById('predMin').innerText = `$${minVal.toFixed(1)}K`;

        // Logic xu hướng (So sánh giờ cuối vs giờ đầu)
        if (predictedData[predictedData.length - 1] > predictedData[0]) {
            trendEl.innerHTML = '<i class="bi bi-arrow-up-right"></i> Đang tăng';
            trendEl.className = "badge badge-trend-up px-3 py-2 rounded-pill";
        } else {
            trendEl.innerHTML = '<i class="bi bi-arrow-down-right"></i> Đang giảm';
            trendEl.className = "badge badge-trend-down px-3 py-2 rounded-pill";
        }

        // 5. VẼ BIỂU ĐỒ
        const ctx = document.getElementById('predictionChart');
        if (predictionChartInstance) {
            predictionChartInstance.destroy();
        }

        predictionChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: `Dự báo (${modelType.toUpperCase()})`,
                        data: predictedData,
                        borderColor: '#6610f2',
                        backgroundColor: 'rgba(102, 16, 242, 0.1)',
                        borderWidth: 3,
                        tension: 0.4,
                        fill: true,
                        pointRadius: 4
                    },
                    {
                        label: 'Thực tế (Tham chiếu)',
                        // Tạo đường tham chiếu giả định để so sánh cho đẹp
                        data: predictedData.map(x => x * (0.9 + Math.random() * 0.2)),
                        borderColor: '#adb5bd',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        tension: 0.4,
                        fill: false,
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' },
                    tooltip: { mode: 'index', intersect: false }
                },
                interaction: { mode: 'nearest', axis: 'x', intersect: false },
                scales: {
                    y: { beginAtZero: true, grid: { borderDash: [2, 4] } },
                    x: { grid: { display: false } }
                }
            }
        });

    } catch (error) {
        console.error("Lỗi:", error);
        if (trendEl) {
            trendEl.innerHTML = '❌ Mất kết nối';
            trendEl.className = "badge bg-danger text-white px-3 py-2 rounded-pill";
        }
        alert("Không kết nối được với Server Python! Hãy chắc chắn bạn đã chạy 'python run.py'");
    }
}
document.addEventListener('DOMContentLoaded', function () {

    // --- 1. KHAI BÁO BIẾN (Lấy các phần tử HTML về trước) ---
    // Dùng querySelector thì nhớ phải có dấu thăng (#) cho ID nhé
    const btnRender = document.querySelector('#btnRender');
    const container = document.querySelector('#chartContainer');
    const title = document.querySelector('#chartTitle');

    // Lấy 2 ô select
    const selectMetric = document.querySelector('#filterMetric');
    const selectTime = document.querySelector('#filterTime');

    // --- 2. GẮN SỰ KIỆN (Add Event Listener) ---
    // Bây giờ gọi tên biến là được, không cần gõ lại document.querySelector...
    btnRender.addEventListener('click', function () {

        // Lấy giá trị hiện tại (value) của 2 ô select khi bấm nút
        const metricValue = selectMetric.value;
        const timeValue = selectTime.value;

        console.log(`Đang xử lý: ${metricValue} - ${timeValue}`);

        // --- 3. XỬ LÝ GIAO DIỆN (Logic Xóa cũ - Thêm mới) ---

        // B1: Xóa sạch cái cũ
        container.innerHTML = '';

        // B2: Tạo thẻ Canvas mới
        const newCanvas = document.createElement('canvas');
        newCanvas.id = 'dynamicChart';
        newCanvas.style.maxHeight = '400px';

        // B3: Nhét vào khung
        container.appendChild(newCanvas);

        // B4: Vẽ
        updateTitle(metricValue, timeValue); // Cập nhật tiêu đề

        // Điều hướng vẽ biểu đồ nào
        if (metricValue === 'pm25') {
            drawChartPM25(newCanvas, timeValue);
        } else if (metricValue === 'pm10') {
            drawChartPM10(newCanvas, timeValue);
        } else {
            drawChartAQI(newCanvas, timeValue);
        }
    });

});

// --- CÁC HÀM VẼ (Giữ nguyên như cũ) ---
function updateTitle(metric, time) {
    // Logic đổi tên tiêu đề...
    if (title) title.innerText = `Kết quả: ${metric} (${time})`;
}

function drawChartPM25(canvas, time) {
    // Code vẽ chart...
    new Chart(canvas, {
        type: 'line',
        data: {
            labels: ['1h', '2h', '3h', '4h', '5h'],
            datasets: [{
                label: 'PM2.5 Demo',
                data: [10, 20, 15, 30, 25],
                borderColor: 'red'
            }]
        }
    });
}

function drawChartPM10(canvas, time) {
    // Code vẽ chart...
    new Chart(canvas, {
        type: 'bar',
        data: {
            labels: ['Khu A', 'Khu B'],
            datasets: [{
                label: 'PM10 Demo',
                data: [50, 80],
                backgroundColor: 'blue'
            }]
        }
    });
}

function drawChartAQI(canvas, time) {
    // Code vẽ chart...
    new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: ['Tốt', 'Xấu'],
            datasets: [{
                data: [70, 30],
                backgroundColor: ['green', 'orange']
            }]
        }
    });
}

document.addEventListener('DOMContentLoaded', function () {
    const DATA_URL = './data/hcm_aqi_dataset.json';

    $.get(DATA_URL, function (_rawData) {
        render6MiniCharts(_rawData);
    });

    const chartInstances = [];

    function render6MiniCharts(_rawData) {
        // Cấu hình ID, màu sắc và NGƯỠNG AN TOÀN WHO (Đường đỏ)
        const chartConfigs = [
            { indicator: 'PM2.5', id: 'race-PM25', color: '#dc3545', threshold: 15 },
            { indicator: 'PM10', id: 'race-PM10', color: '#fd7e14', threshold: 45 },
            { indicator: 'NO2', id: 'race-NO2', color: '#0dcaf0', threshold: 25 },
            { indicator: 'O3', id: 'race-O3', color: '#0d6efd', threshold: 100 },
            { indicator: 'SO2', id: 'race-SO2', color: '#6f42c1', threshold: 40 },
            { indicator: 'AQI', id: 'race-AQI', color: '#198754', threshold: 100 }
        ];

        const header = _rawData[0];

        chartConfigs.forEach(function (config) {
            const dom = document.getElementById(config.id);
            if (!dom) return;

            const myChart = echarts.init(dom);
            chartInstances.push(myChart);

            const colIndex = header.indexOf(config.indicator);

            const option = {
                // Tăng thời gian đua lên 20s vì giờ có tới 36 tháng (rất nhiều điểm dữ liệu)
                animationDuration: 20000,
                dataset: { source: _rawData },
                tooltip: { trigger: 'axis' },
                grid: {
                    top: 25, bottom: 25, left: 35, right: 60 // Chừa chỗ bên phải cho chữ
                },
                xAxis: {
                    type: 'category',
                    // ECharts sẽ tự động lấy dữ liệu từ cột 'Month' để làm trục X
                    axisLabel: {
                        formatter: function (value) {
                            // Cắt bớt chữ, ví dụ "2023-01" -> "01/23" cho gọn
                            if (!value) return '';
                            const parts = value.split('-');
                            return parts.length === 2 ? `${parts[1]}/${parts[0].substring(2)}` : value;
                        }
                    }
                },
                yAxis: {
                    type: 'value',
                    splitLine: { show: true, lineStyle: { type: 'dashed', color: '#eee' } }
                },
                series: [{
                    type: 'line',
                    name: config.indicator,
                    encode: {
                        x: 'Month', // TRỤC X LÀ THÁNG
                        y: config.indicator
                    },
                    showSymbol: false,
                    lineStyle: { width: 3, color: config.color },
                    itemStyle: { color: config.color },

                    // --- THÊM ĐƯỜNG ĐỎ CẢNH BÁO WHO ---
                    markLine: {
                        symbol: ['none', 'none'], // Không có mũi tên ở 2 đầu
                        label: {
                            show: true,
                            position: 'end',
                            formatter: 'WHO: {c}', // Hiển thị chữ "WHO: số"
                            color: 'red',
                            fontSize: 10,
                            fontWeight: 'bold'
                        },
                        lineStyle: {
                            color: 'red',
                            type: 'dashed',
                            width: 1.5
                        },
                        data: [
                            { yAxis: config.threshold } // Lấy ngưỡng từ cấu hình trên
                        ]
                    },
                    // ----------------------------------

                    endLabel: {
                        show: true,
                        formatter: function (params) {
                            let val = params.value[colIndex];
                            return val ? Number(val).toFixed(1) : '';
                        },
                        fontSize: 12,
                        fontWeight: 'bold',
                        color: config.color
                    }
                }]
            };

            myChart.setOption(option);
        });
    }

    window.addEventListener('resize', function () {
        chartInstances.forEach(chart => chart.resize());
    });
});

// Thay vì viết cứng dữ liệu, giờ ta gọi API lấy file JSON vừa tạo
document.addEventListener('DOMContentLoaded', function () {

    const windInstances = []; // Lưu lại để resize

    $.get('./data/hcm_wind_dataset.json', function (data) {

        // Danh sách các mục tiêu cần vẽ (Khớp với ID trong HTML)
        const targets = [
            { m: 1, y: 2023 }, { m: 1, y: 2024 }, { m: 1, y: 2025 },
            { m: 6, y: 2023 }, { m: 6, y: 2024 }, { m: 6, y: 2025 },
            { m: 12, y: 2023 }, { m: 12, y: 2024 }, { m: 12, y: 2025 }
        ];

        targets.forEach(function (target) {
            // Tạo ID động: wind-m1-y2023
            const domId = `wind-m${target.m}-y${target.y}`;
            const dom = document.getElementById(domId);

            if (!dom) return; // Nếu lỡ xóa div nào thì bỏ qua

            // Lấy dữ liệu tương ứng từ JSON
            const key = `m${target.m}_y${target.y}`;
            const chartData = data.grid[key];

            const myChart = echarts.init(dom);
            windInstances.push(myChart);

            if (!chartData) {
                // Nếu không có dữ liệu (ví dụ chưa tới tháng 12/2025)
                myChart.setOption({
                    title: { text: 'Chưa có dữ liệu', left: 'center', top: 'center', textStyle: { fontSize: 12, color: '#999' } }
                });
                return;
            }

            // Tạo các lớp (stack) cho biểu đồ
            const seriesConfig = data.legend.map((name, index) => ({
                type: 'bar',
                data: chartData.series_data[index],
                coordinateSystem: 'polar',
                name: name,
                stack: 'wind'
            }));

            const option = {
                color: ['#a2d2ff', '#5c9ce6', '#2b65bd', '#123473'],
                tooltip: {
                    trigger: 'item',
                    formatter: '{a} <br/>{b}: {c} giờ'
                },
                // Legend chỉ hiện ở biểu đồ đầu tiên hoặc tắt đi cho gọn (ở đây mình tắt cho thoáng)
                legend: { show: false },
                polar: { radius: '65%' }, // Thu nhỏ xíu để không bị cắt chữ
                angleAxis: {
                    type: 'category',
                    data: data.directions,
                    boundaryGap: false,
                    splitLine: { show: true, lineStyle: { color: '#eee' } },
                    axisLine: { show: false },
                    axisLabel: { interval: 3, fontSize: 9 } // Chỉ hiện N, E, S, W cho đỡ rối (interval=3)
                },
                radiusAxis: {
                    type: 'value',
                    axisLine: { show: false },
                    axisLabel: { show: false }
                },
                series: seriesConfig
            };

            myChart.setOption(option);
        });

    }).fail(function () {
        console.error("Lỗi tải file wind_rose_grid.json");
    });

    // Resize tất cả 9 biểu đồ khi co giãn màn hình
    window.addEventListener('resize', function () {
        windInstances.forEach(chart => chart.resize());
    });
});
// Chạy lần đầu khi load trang
document.addEventListener('DOMContentLoaded', function () {
    runPrediction();
});