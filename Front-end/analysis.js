// Đường dẫn file data của bạn (File chứa mảng array nãy tui check đó)
const DATA_URL = './data/hcm_aqi_dataset.json';

document.addEventListener('DOMContentLoaded', function () {
    // 1. Khởi tạo 6 ô biểu đồ
    let chartMonth = echarts.init(document.getElementById('chartMonth'));
    let chartHour = echarts.init(document.getElementById('chartHour'));
    let chartCause = echarts.init(document.getElementById('chartCause'));
    let chartWind = echarts.init(document.getElementById('chartWind'));
    let chartHumidity = echarts.init(document.getElementById('chartHumidity'));
    let chartSeason = echarts.init(document.getElementById('chartSeason'));

    // Resize tự động khi thu phóng cửa sổ
    window.addEventListener('resize', function () {
        chartMonth.resize(); chartHour.resize(); chartCause.resize();
        chartWind.resize(); chartHumidity.resize(); chartSeason.resize();
    });

    // 2. Hàm vẽ toàn bộ biểu đồ
    function renderCharts(rawData) {
        // Kiểm tra data hợp lệ (File JSON của bạn là mảng bọc mảng)
        if (!Array.isArray(rawData) || rawData.length < 2) return;

        const dataRows = rawData.slice(1); // Bỏ dòng tiêu đề đầu tiên

        // Biến lưu trữ cho Chart 1 và Chart 5 (Data thật)
        const pm25ByMonth = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        const monthCounts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        const yearData = {};

        // RÚT DATA THẬT
        dataRows.forEach((row) => {
            const monthStr = row[0]; // VD: "2023-01"
            if (!monthStr || typeof monthStr !== 'string') return;

            const parts = monthStr.split('-');
            if (parts.length !== 2) return;

            const y = parseInt(parts[0]);
            const m = parseInt(parts[1]) - 1;
            const pm25 = Number(row[1]) || 0;

            // Cộng dồn để vẽ chart tháng
            pm25ByMonth[m] += pm25;
            monthCounts[m] += 1;

            // Nhóm theo năm để vẽ chart mùa vụ
            if (!yearData[y]) yearData[y] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            yearData[y][m] = pm25;
        });

        // Tính trung bình
        const pm25Avg = pm25ByMonth.map((v, i) => monthCounts[i] ? (v / monthCounts[i]).toFixed(1) : 0);
        const rainMock = [15, 10, 20, 60, 200, 300, 320, 280, 250, 150, 50, 20];

        // =========================================================
        // CHƯƠNG 1: BỤI THEO THÁNG (DATA THẬT)
        // =========================================================
        chartMonth.setOption({
            tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
            legend: { data: ['PM2.5 Trung bình', 'Lượng mưa (mm)'] },
            grid: { left: '10%', right: '10%', bottom: '15%' },
            xAxis: { type: 'category', data: ['Th 1', 'Th 2', 'Th 3', 'Th 4', 'Th 5', 'Th 6', 'Th 7', 'Th 8', 'Th 9', 'Th 10', 'Th 11', 'Th 12'] },
            yAxis: [
                { type: 'value', name: 'PM2.5 (µg/m³)' },
                { type: 'value', name: 'Mưa (mm)', splitLine: { show: false } }
            ],
            series: [
                {
                    name: 'PM2.5 Trung bình', type: 'bar', data: pm25Avg,
                    itemStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#f59e0b' }, { offset: 1, color: '#fbbf24' }]),
                        borderRadius: [5, 5, 0, 0]
                    }
                },
                {
                    name: 'Lượng mưa (mm)', type: 'line', yAxisIndex: 1, data: rainMock, smooth: true,
                    lineStyle: { color: '#3b82f6', width: 3 },
                    areaStyle: { color: 'rgba(59, 130, 246, 0.2)' }
                }
            ]
        });

        // =========================================================
        // CHƯƠNG 2: BỤI THEO GIỜ 
        // =========================================================
        const xHours = ['0h', '2h', '4h', '6h', '8h', '10h', '12h', '14h', '16h', '18h', '20h', '22h'];
        chartHour.setOption({
            tooltip: { trigger: 'axis' },
            grid: { left: '8%', right: '5%', bottom: '15%' },
            xAxis: { type: 'category', boundaryGap: false, data: xHours },
            yAxis: { type: 'value', name: 'AQI' },
            series: [{
                name: 'Chỉ số AQI', type: 'line', smooth: true,
                data: [65, 60, 55, 75, 120, 95, 60, 50, 85, 140, 110, 80],
                lineStyle: { width: 4, color: '#ef4444' },
                areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(239, 68, 68, 0.5)' }, { offset: 1, color: 'rgba(239, 68, 68, 0)' }]) },
                markPoint: {
                    data: [
                        { type: 'max', name: 'Max Tối', itemStyle: { color: '#991b1b' } },
                        { coord: [4, 120], name: 'Max Sáng', itemStyle: { color: '#dc2626' } },
                        { type: 'min', name: 'Min', itemStyle: { color: '#10b981' } }
                    ]
                }
            }]
        });

        // =========================================================
        // CHƯƠNG 3: GIAO THÔNG (PM2.5 vs NO2)
        // =========================================================
        const xTrafficHours = ['0h', '4h', '8h (Đi làm)', '12h', '16h', '18h (Tan tầm)', '22h'];
        chartCause.setOption({
            tooltip: { trigger: 'axis' },
            legend: { data: ['Bụi mịn PM2.5', 'Khí NO2 (Ống xả)'] },
            grid: { left: '10%', right: '10%', bottom: '15%' },
            xAxis: { type: 'category', boundaryGap: false, data: xTrafficHours },
            yAxis: [
                { type: 'value', name: 'PM2.5' },
                { type: 'value', name: 'NO2 (ppb)', splitLine: { show: false } }
            ],
            series: [
                { name: 'Bụi mịn PM2.5', type: 'line', smooth: true, data: [35, 30, 65, 25, 40, 75, 45], lineStyle: { width: 3, color: '#64748b' }, itemStyle: { color: '#64748b' } },
                { name: 'Khí NO2 (Ống xả)', type: 'line', yAxisIndex: 1, smooth: true, data: [20, 15, 80, 25, 50, 95, 30], lineStyle: { width: 3, type: 'dashed', color: '#8b5cf6' }, itemStyle: { color: '#8b5cf6' } }
            ]
        });

        // =========================================================
        // CHƯƠNG 4: HƯỚNG GIÓ VÀ ĐỘ ẨM
        // =========================================================
        const windData = [];
        const humData = [];
        for (let i = 0; i < 200; i++) {
            let wd = Math.random() * 360;
            let pmW = 15 + Math.random() * 30;
            if (wd > 90 && wd < 180) pmW += 30 + Math.random() * 40;
            windData.push([pmW.toFixed(1), wd.toFixed(0)]);

            let hum = 40 + Math.random() * 60;
            let pmH = hum * 0.4 + Math.random() * 20;
            if (hum > 75) pmH += 15 + Math.random() * 30;
            humData.push([hum.toFixed(1), pmH.toFixed(1)]);
        }

        chartWind.setOption({
            title: { text: 'Nồng độ PM2.5 theo Hướng Gió', left: 'center', top: 5, textStyle: { fontSize: 14, color: '#475569' } },
            tooltip: { formatter: 'Hướng: {c[1]}°<br/>PM2.5: <b>{c[0]}</b> µg/m³' },
            polar: { center: ['50%', '55%'], radius: '65%' },
            angleAxis: { type: 'value', min: 0, max: 360, interval: 45, axisLabel: { formatter: '{value}°' }, splitLine: { lineStyle: { type: 'dashed' } } },
            radiusAxis: { type: 'value', name: 'PM2.5' },
            visualMap: { show: false, min: 10, max: 100, inRange: { color: ['#10b981', '#fbbf24', '#ef4444', '#7f1d1d'] } },
            series: [{ type: 'scatter', coordinateSystem: 'polar', data: windData, symbolSize: 8, itemStyle: { opacity: 0.7 } }]
        });

        chartHumidity.setOption({
            title: { text: 'Tương quan Độ Ẩm & PM2.5', left: 'center', top: 5, textStyle: { fontSize: 14, color: '#475569' } },
            tooltip: { formatter: 'Độ ẩm: {c[0]}%<br/>PM2.5: <b>{c[1]}</b> µg/m³' },
            grid: { left: '10%', right: '5%', bottom: '15%', top: '20%' },
            xAxis: { type: 'value', name: 'Độ ẩm (%)', min: 40, max: 100, splitLine: { show: false } },
            yAxis: { type: 'value', name: 'PM2.5', splitLine: { lineStyle: { type: 'dashed' } } },
            visualMap: { show: false, min: 40, max: 100, dimension: 0, inRange: { color: ['#cbd5e1', '#3b82f6', '#1e3a8a'] } },
            series: [{ type: 'scatter', data: humData, symbolSize: 8, itemStyle: { opacity: 0.7 } }]
        });

        // =========================================================
        // CHƯƠNG 5: MÙA VỤ CHỒNG LỚP NĂM (DATA THẬT)
        // =========================================================
        const availableYears = Object.keys(yearData).sort();
        const yearColors = ['#94a3b8', '#f59e0b', '#10b981', '#3b82f6'];

        chartSeason.setOption({
            tooltip: { trigger: 'axis' },
            legend: { data: availableYears.map(y => `Năm ${y}`), top: 0 },
            grid: { left: '5%', right: '5%', bottom: '10%', containLabel: true },
            xAxis: { type: 'category', boundaryGap: false, data: ['Tháng 1', 'Th 2', 'Th 3', 'Th 4', 'Th 5', 'Th 6', 'Th 7', 'Th 8', 'Th 9', 'Th 10', 'Th 11', 'Th 12'] },
            yAxis: { type: 'value', name: 'PM2.5 (µg/m³)' },
            series: availableYears.map((y, idx) => ({
                name: `Năm ${y}`,
                type: 'line',
                smooth: true,
                // Xử lý để những tháng chưa có data không bị dính xuống số 0
                data: yearData[y].map(v => v ? v.toFixed(1) : null),
                lineStyle: { width: idx === availableYears.length - 1 ? 4 : 2, color: yearColors[idx % yearColors.length] },
                itemStyle: { color: yearColors[idx % yearColors.length] },
                // Đổ bóng cho năm cuối cùng
                areaStyle: idx === availableYears.length - 1 ? { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(16, 185, 129, 0.3)' }, { offset: 1, color: 'rgba(16, 185, 129, 0)' }]) } : null
            }))
        });
    }

    // 3. Tải file JSON và nạp vào máy xay (Nhớ ép trình duyệt qua HTTP localhost)
    $.get(DATA_URL, function (res) {
        console.log("Kéo file JSON thành công! Đang vẽ biểu đồ...");
        renderCharts(res);
    }).fail(function () {
        alert("Không tải được Data! Lỗi đường dẫn: " + DATA_URL);
    });
});