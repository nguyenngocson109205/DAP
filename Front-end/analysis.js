/* =========================================================
A. PHẦN 1: DỮ LIỆU TỔNG HỢP (CHƯƠNG 1 -> 5)
========================================================= */
const DATA_URL = './data/hcm_aqi_dataset.json';

document.addEventListener('DOMContentLoaded', function () {
    let chartMonth = echarts.init(document.getElementById('chartMonth'));
    let chartHour = echarts.init(document.getElementById('chartHour'));
    let chartCause = echarts.init(document.getElementById('chartCause'));
    let chartWind = echarts.init(document.getElementById('chartWind'));
    let chartHumidity = echarts.init(document.getElementById('chartHumidity'));
    let chartSeason = echarts.init(document.getElementById('chartSeason'));

    window.addEventListener('resize', function () {
        chartMonth.resize(); chartHour.resize(); chartCause.resize();
        chartWind.resize(); chartHumidity.resize(); chartSeason.resize();
    });

    function renderCharts(rawData) {
        if (!Array.isArray(rawData) || rawData.length < 2) return;
        const dataRows = rawData.slice(1);

        const pm25ByMonth = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        const monthCounts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        const yearData = {};

        dataRows.forEach((row) => {
            const monthStr = row[0];
            if (!monthStr || typeof monthStr !== 'string') return;

            const parts = monthStr.split('-');
            if (parts.length !== 2) return;

            const y = parseInt(parts[0]);
            const m = parseInt(parts[1]) - 1;
            const pm25 = Number(row[1]) || 0;

            pm25ByMonth[m] += pm25;
            monthCounts[m] += 1;

            if (!yearData[y]) yearData[y] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            yearData[y][m] = pm25;
        });

        const pm25Avg = pm25ByMonth.map((v, i) => monthCounts[i] ? (v / monthCounts[i]).toFixed(1) : 0);
        const rainMock = [15, 10, 20, 60, 200, 300, 320, 280, 250, 150, 50, 20];

        // 1. CHART THÁNG
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
                { name: 'PM2.5 Trung bình', type: 'bar', data: pm25Avg, itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#f59e0b' }, { offset: 1, color: '#fbbf24' }]), borderRadius: [5, 5, 0, 0] } },
                { name: 'Lượng mưa (mm)', type: 'line', yAxisIndex: 1, data: rainMock, smooth: true, lineStyle: { color: '#3b82f6', width: 3 }, areaStyle: { color: 'rgba(59, 130, 246, 0.2)' } }
            ]
        });

        // 2. CHART GIỜ
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
                    // THÊM ĐOẠN FORMAT LABEL NÀY ĐỂ HIỂN THỊ 2 DÒNG
                    label: {
                        show: true,
                        formatter: '{c}', // {b} là Tên (name), {c} là Giá trị (value)
                        lineHeight: 16,        // Chỉnh khoảng cách 2 dòng chữ cho xịn
                        align: 'center'
                    },
                    data: [
                        { type: 'max', itemStyle: { color: '#991b1b' } },
                        // THÊM value: 120 VÀO ĐÂY NÈ BRO
                        { coord: [4, 120], value: 120, itemStyle: { color: '#dc2626' } },
                        { type: 'min', name: 'Min', itemStyle: { color: '#10b981' } }
                    ]
                }
            }]
        });

        // 3. CHART NGUYÊN NHÂN (NO2)
        const xTrafficHours = ['0h', '4h', '8h (Đi làm)', '12h', '16h', '18h (Tan tầm)', '22h'];
        chartCause.setOption({
            tooltip: { trigger: 'axis' },
            legend: { data: ['Bụi mịn PM2.5', 'Khí NO2 (Ống xả)'] },
            grid: { left: '10%', right: '10%', bottom: '15%' },
            xAxis: { type: 'category', boundaryGap: false, data: xTrafficHours },
            yAxis: [{ type: 'value', name: 'PM2.5' }, { type: 'value', name: 'NO2 (ppb)', splitLine: { show: false } }],
            series: [
                { name: 'Bụi mịn PM2.5', type: 'line', smooth: true, data: [35, 30, 65, 25, 40, 75, 45], lineStyle: { width: 3, color: '#64748b' }, itemStyle: { color: '#64748b' } },
                { name: 'Khí NO2 (Ống xả)', type: 'line', yAxisIndex: 1, smooth: true, data: [20, 15, 80, 25, 50, 95, 30], lineStyle: { width: 3, type: 'dashed', color: '#8b5cf6' }, itemStyle: { color: '#8b5cf6' } }
            ]
        });

        // 4. CHART GIÓ & ĐỘ ẨM
        const windData = []; const humData = [];
        for (let i = 0; i < 200; i++) {
            let wd = Math.random() * 360; let pmW = 15 + Math.random() * 30;
            if (wd > 90 && wd < 180) pmW += 30 + Math.random() * 40;
            windData.push([pmW.toFixed(1), wd.toFixed(0)]);

            let hum = 40 + Math.random() * 60; let pmH = hum * 0.4 + Math.random() * 20;
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

        // 5. CHART MÙA VỤ THEO NĂM
        const availableYears = Object.keys(yearData).sort();
        const yearColors = ['#94a3b8', '#f59e0b', '#10b981', '#3b82f6'];

        chartSeason.setOption({
            tooltip: { trigger: 'axis' },
            legend: { data: availableYears.map(y => `Năm ${y}`), top: 0 },
            grid: { left: '5%', right: '5%', bottom: '10%', containLabel: true },
            xAxis: { type: 'category', boundaryGap: false, data: ['Tháng 1', 'Th 2', 'Th 3', 'Th 4', 'Th 5', 'Th 6', 'Th 7', 'Th 8', 'Th 9', 'Th 10', 'Th 11', 'Th 12'] },
            yAxis: { type: 'value', name: 'PM2.5 (µg/m³)' },
            series: availableYears.map((y, idx) => ({
                name: `Năm ${y}`, type: 'line', smooth: true,
                data: yearData[y].map(v => v ? v.toFixed(1) : null),
                lineStyle: { width: idx === availableYears.length - 1 ? 4 : 2, color: yearColors[idx % yearColors.length] },
                itemStyle: { color: yearColors[idx % yearColors.length] },
                areaStyle: idx === availableYears.length - 1 ? { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(16, 185, 129, 0.3)' }, { offset: 1, color: 'rgba(16, 185, 129, 0)' }]) } : null
            }))
        });
    }

    $.get(DATA_URL, function (res) {
        renderCharts(res);
    }).fail(function () {
        console.error("Lỗi tải file: " + DATA_URL);
    });
});


/* =========================================================
   B. PHẦN 2: CHƯƠNG 6 - HOA GIÓ & BIỂU ĐỒ CỘT PM2.5
   ========================================================= */
document.addEventListener('DOMContentLoaded', function () {
    const windInstances = [];
    const pm25Instances = [];

    $.get('./data/hcm_wind_dataset.json', function (data) {
        const targets = [
            { m: 1, y: 2023 }, { m: 1, y: 2024 }, { m: 1, y: 2025 },
            { m: 6, y: 2023 }, { m: 6, y: 2024 }, { m: 6, y: 2025 },
            { m: 12, y: 2023 }, { m: 12, y: 2024 }, { m: 12, y: 2025 }
        ];

        targets.forEach(function (target) {
            // --- 1. VẼ BIỂU ĐỒ HOA GIÓ ---
            const domId_Wind = `wind-m${target.m}-y${target.y}`;
            const dom_Wind = document.getElementById(domId_Wind);

            const key = `m${target.m}_y${target.y}`;
            const chartData = data.grid[key];

            if (dom_Wind) {
                const myChart_Wind = echarts.init(dom_Wind);
                windInstances.push(myChart_Wind);

                if (!chartData) {
                    myChart_Wind.setOption({ title: { text: 'Chưa có dữ liệu' } });
                } else {
                    const seriesConfig = data.legend.map((name, index) => ({
                        type: 'bar',
                        data: chartData.series_data[index],
                        coordinateSystem: 'polar',
                        name: name,
                        stack: 'wind'
                    }));

                    myChart_Wind.setOption({
                        color: ['#a2d2ff', '#5c9ce6', '#2b65bd', '#123473'],
                        tooltip: { trigger: 'item', formatter: '{a} <br/>{b}: {c} giờ' },
                        legend: { show: false },
                        polar: { radius: '65%' },
                        angleAxis: { type: 'category', data: data.directions, boundaryGap: false, splitLine: { show: true }, axisLine: { show: false }, axisLabel: { interval: 3, fontSize: 9 } },
                        radiusAxis: { type: 'value', axisLine: { show: false }, axisLabel: { show: false } },
                        series: seriesConfig
                    });
                }
            }

        });

        // Hỗ trợ resize cho 18 biểu đồ mới
        window.addEventListener('resize', function () {
            windInstances.forEach(chart => chart.resize());
            pm25Instances.forEach(chart => chart.resize());
        });

    }).fail(function () {
        console.error("Lỗi tải file hcm_wind_dataset.json");
    });
});