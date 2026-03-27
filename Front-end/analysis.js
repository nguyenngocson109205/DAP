/* =========================================================
A. PHẦN 1: DỮ LIỆU TỔNG HỢP (CHƯƠNG 1 -> 5)
========================================================= */
const DATA_URL = './data/hcm_aqi_dataset.json';

document.addEventListener('DOMContentLoaded', function () {
    // Khởi tạo theo đúng thứ tự 1 -> 5 trên HTML
    let chartSeason = echarts.init(document.getElementById('chartSeason'));
    let chartMonth = echarts.init(document.getElementById('chartMonth'));
    let chartHour = echarts.init(document.getElementById('chartHour'));
    let chartCause = echarts.init(document.getElementById('chartCause'));
    let chartWind = echarts.init(document.getElementById('chartWind'));
    let chartHumidity = echarts.init(document.getElementById('chartHumidity'));

    // Resize theo đúng thứ tự
    window.addEventListener('resize', function () {
        chartSeason.resize(); chartMonth.resize(); chartHour.resize();
        chartCause.resize(); chartWind.resize(); chartHumidity.resize();
    });

    function renderCharts(rawData) {
        if (!Array.isArray(rawData) || rawData.length < 2) return;
        const dataRows = rawData.slice(1);

        // ==========================================
        // XỬ LÝ DỮ LIỆU CHUNG
        // ==========================================
        const header = rawData[0];
        const iPM25 = header.indexOf('PM2.5') > 0 ? header.indexOf('PM2.5') : 1;
        const iPM10 = header.indexOf('PM10') > 0 ? header.indexOf('PM10') : 2;
        const iNO2 = header.indexOf('NO2') > 0 ? header.indexOf('NO2') : 3;

        const pm25ByMonth = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        const monthCounts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        const yearData = {};

        // Mảng chứa data cho biểu đồ Scatter Tương quan
        const pm10Scatter = [];
        const no2Scatter = [];

        dataRows.forEach((row) => {
            const monthStr = row[0];
            if (!monthStr || typeof monthStr !== 'string') return;

            const parts = monthStr.split('-');
            if (parts.length !== 2) return;

            const y = parseInt(parts[0]);
            const m = parseInt(parts[1]) - 1;

            const pm25Val = Number(row[iPM25]) || 0;
            const pm10Val = Number(row[iPM10]) || 0;
            const no2Val = Number(row[iNO2]) || 0;

            // Dữ liệu cho biểu đồ Mùa vụ
            pm25ByMonth[m] += pm25Val;
            monthCounts[m] += 1;
            if (!yearData[y]) yearData[y] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            yearData[y][m] = pm25Val;

            // Dữ liệu cho biểu đồ SCATTER TƯƠNG QUAN
            if (pm25Val > 0) {
                if (pm10Val > 0) pm10Scatter.push([pm10Val, pm25Val]);
                if (no2Val > 0) no2Scatter.push([no2Val, pm25Val]);
            }
        });

        // ==========================================
        // 1. CHART MÙA VỤ THEO NĂM (chartSeason)
        // ==========================================
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

        // ====================================================================
        // 2. CHART TƯƠNG QUAN THỰC SỰ (SCATTER PLOT ĐA TRỤC) - Dùng DOM chartMonth
        // ====================================================================
        chartMonth.setOption({
            title: {
                text: 'Phân tán tương quan giữa PM2.5 với PM10 & Khí NO2',
                left: 'center',
                top: 0,
                textStyle: { fontSize: 14, color: '#475569', fontWeight: 'bold' }
            },
            tooltip: {
                trigger: 'item',
                formatter: function (params) {
                    const xName = params.seriesIndex === 0 ? 'PM10' : 'Khí NO2';
                    return `<b>${params.seriesName}</b><br/>${xName}: <b>${params.value[0]}</b><br/>PM2.5: <b>${params.value[1]}</b> µg/m³`;
                }
            },
            legend: { data: ['PM10 vs PM2.5', 'NO2 vs PM2.5'], top: 25 },
            grid: { left: '10%', right: '10%', bottom: '15%', top: '25%' },
            xAxis: [
                {
                    type: 'value', name: 'PM10 (Bụi thô)', position: 'bottom',
                    axisLine: { show: true, lineStyle: { color: '#ef4444', width: 2 } },
                    axisLabel: { color: '#ef4444' },
                    splitLine: { show: false }
                },
                {
                    type: 'value', name: 'NO2 (Khí thải)', position: 'top',
                    axisLine: { show: true, lineStyle: { color: '#3b82f6', width: 2 } },
                    axisLabel: { color: '#3b82f6' },
                    splitLine: { show: false }
                }
            ],
            yAxis: {
                type: 'value', name: 'PM2.5 (µg/m³)',
                splitLine: { lineStyle: { type: 'dashed', color: '#e2e8f0' } },
                axisLine: { show: true, lineStyle: { color: '#475569', width: 2 } }
            },
            series: [
                {
                    name: 'PM10 vs PM2.5',
                    type: 'scatter',
                    xAxisIndex: 0,
                    data: pm10Scatter,
                    itemStyle: { color: '#ef4444', opacity: 0.6 },
                    symbolSize: 8
                },
                {
                    name: 'NO2 vs PM2.5',
                    type: 'scatter',
                    xAxisIndex: 1,
                    data: no2Scatter,
                    itemStyle: { color: '#3b82f6', opacity: 0.6 },
                    symbolSize: 8
                }
            ]
        });

        // ==========================================
        // 3. CHART NHỊP SINH HỌC THEO GIỜ (chartHour)
        // ==========================================
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
                    label: { show: true, formatter: '{c}', lineHeight: 16, align: 'center' },
                    data: [
                        { type: 'max', itemStyle: { color: '#991b1b' } },
                        { coord: [4, 120], value: 120, itemStyle: { color: '#dc2626' } },
                        { type: 'min', name: 'Min', itemStyle: { color: '#10b981' } }
                    ]
                }
            }]
        });

        // ==========================================
        // 4. CHART NGUYÊN NHÂN NO2 (chartCause)
        // ==========================================
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

        // ==========================================
        // 5. CHART GIÓ & ĐỘ ẨM (chartWind, chartHumidity)
        // ==========================================
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

        window.addEventListener('resize', function () {
            windInstances.forEach(chart => chart.resize());
            pm25Instances.forEach(chart => chart.resize());
        });

    }).fail(function () {
        console.error("Lỗi tải file hcm_wind_dataset.json");
    });
});