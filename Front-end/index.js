/* =========================================
   1. LOGIC NAVBAR - ĐĂNG NHẬP / ĐĂNG XUẤT
   ========================================= */
window.handleLogout = function (event) {
    if (event) event.preventDefault();
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    window.location.reload();
};

document.addEventListener('DOMContentLoaded', function () {
    const navLogin = document.getElementById('nav-login');
    const navRegister = document.getElementById('nav-register');
    const navLogout = document.getElementById('nav-logout');
    const navUserInfo = document.getElementById('nav-user-info');
    const displayUserName = document.getElementById('displayUserName');

    // DỌN DẸP STYLE: Xóa sạch style inline lỡ có trong HTML
    [navLogin, navRegister, navLogout, navUserInfo].forEach(el => {
        if (el) el.removeAttribute('style');
    });

    // QUAN TRỌNG: Phải khớp đúng chữ 'accessToken' (T viết hoa)
    const token = localStorage.getItem('accessToken');
    const rawUser = localStorage.getItem('user');

    if (token) {
        // --- NẾU ĐÃ ĐĂNG NHẬP (CÓ TOKEN) ---
        let displayName = "User";
        try {
            if (rawUser) {
                const parsed = JSON.parse(rawUser);
                displayName = parsed.name || "User";
            }
        } catch (e) { console.error(e); }

        if (navLogin) navLogin.classList.add('hide-nav-item');
        if (navRegister) navRegister.classList.add('hide-nav-item');

        if (navUserInfo) {
            navUserInfo.classList.remove('hide-nav-item');
            if (displayUserName) displayUserName.innerText = displayName;
        }
        if (navLogout) navLogout.classList.remove('hide-nav-item');

    } else {
        // --- NẾU CHƯA ĐĂNG NHẬP (TOKEN TRỐNG) ---
        if (navLogin) navLogin.classList.remove('hide-nav-item');
        if (navRegister) navRegister.classList.remove('hide-nav-item');

        if (navUserInfo) navUserInfo.classList.add('hide-nav-item');
        if (navLogout) navLogout.classList.add('hide-nav-item');
    }
});
/* =========================================
   2. HERO SECTION - TRA CỨU NHANH API
   ========================================= */
document.addEventListener('DOMContentLoaded', function () {
    const searchDropdown = document.getElementById('districtSearch');
    const overlay = document.getElementById('hero-overlay');
    const summaryCard = document.getElementById('quickSummaryCard');

    const locations = {
        'q1': { lat: 10.7756, lon: 106.7019, name: 'Khu vực: Quận 1' },
        'q2': { lat: 10.7872, lon: 106.7495, name: 'Khu vực: Quận 2' },
        'tb': { lat: 10.8015, lon: 106.6526, name: 'Khu vực: Tân Bình' },
        'gv': { lat: 10.8281, lon: 106.6734, name: 'Khu vực: Gò Vấp' },
        'q7': { lat: 10.7339, lon: 106.7265, name: 'Khu vực: Quận 7' }
    };

    const apiCache = {};

    if (!searchDropdown) return;

    searchDropdown.addEventListener('change', async function () {
        const val = this.value;
        const loc = locations[val];
        if (!loc) return;

        document.getElementById('qsDistrictName').innerText = loc.name;
        document.getElementById('qsStatusColor').innerText = "Đang xử lý...";
        document.getElementById('qsStatusColor').style.color = '#6c757d';
        document.getElementById('qsPm25Text').innerHTML = `<span class="spinner-border spinner-border-sm"></span> Đang kết nối...`;

        overlay.style.backdropFilter = 'blur(8px)';
        summaryCard.classList.remove('d-none');
        setTimeout(() => {
            summaryCard.style.transform = 'translateY(0)';
            summaryCard.style.opacity = '1';
        }, 50);

        try {
            let pm25, aqi, temp;

            if (apiCache[val]) {
                pm25 = apiCache[val].pm25;
                aqi = apiCache[val].aqi;
                temp = apiCache[val].temp;
            } else {
                const api_AirQuality = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${loc.lat}&longitude=${loc.lon}&current=pm2_5,european_aqi`;
                const api_Weather = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&current=temperature_2m`;

                const [resAir, resWeather] = await Promise.all([
                    fetch(api_AirQuality),
                    fetch(api_Weather)
                ]);

                const dataAir = await resAir.json();
                const dataWeather = await resWeather.json();

                pm25 = dataAir.current.pm2_5;
                aqi = dataAir.current.european_aqi;
                temp = dataWeather.current.temperature_2m;

                apiCache[val] = { pm25: pm25, aqi: aqi, temp: temp };
            }

            let status, color, bgBadge, advice, alertClass;

            if (pm25 <= 15) {
                status = 'Tốt (Good)'; color = '#198754'; bgBadge = 'bg-success text-white'; alertClass = 'alert-success text-success';
                advice = 'Không khí trong lành. Rất thích hợp để tập thể dục và hít thở.';
            } else if (pm25 <= 35) {
                status = 'Trung bình (Moderate)'; color = '#fd7e14'; bgBadge = 'bg-warning text-dark'; alertClass = 'alert-warning text-dark';
                advice = 'Nhóm nhạy cảm nên hạn chế hoạt động ngoài trời.';
            } else if (pm25 <= 75) {
                status = 'Kém (Unhealthy)'; color = '#dc3545'; bgBadge = 'bg-danger text-white'; alertClass = 'alert-danger text-danger';
                advice = 'Khuyên dùng khẩu trang y tế/N95 khi ra đường. Hạn chế mở cửa sổ.';
            } else {
                status = 'Rất Kém (Nguy hiểm)'; color = '#6f42c1'; bgBadge = 'bg-danger text-white'; alertClass = 'alert-danger text-danger';
                advice = 'Cực kỳ độc hại! Tuyệt đối tránh các hoạt động thể thao ngoài trời.';
            }

            document.getElementById('qsAqiBadge').className = `badge rounded-pill px-3 py-2 shadow-sm ${bgBadge}`;
            document.getElementById('qsAqiBadge').innerText = `AQI: ${aqi}`;
            document.getElementById('qsStatusColor').innerText = status;
            document.getElementById('qsStatusColor').style.color = color;

            let pmText = `Bụi mịn PM2.5: <b>${pm25} µg/m³</b>`;
            if (pm25 > 15) pmText += ` (Vượt ${(pm25 / 15).toFixed(1)} lần chuẩn WHO)`;
            else pmText += ` (Đạt chuẩn an toàn)`;

            document.getElementById('qsPm25Text').innerHTML = `${pmText} <br/> <i class="bi bi-thermometer-sun text-warning mt-1"></i> Nhiệt độ: <b>${temp}°C</b>`;
            document.getElementById('qsAdvice').className = `alert mb-0 border-0 fw-medium ${alertClass}`;
            document.getElementById('qsAdvice').innerHTML = `<i class="bi bi-info-circle-fill me-2"></i> ${advice}`;

        } catch (error) {
            console.error("Lỗi khi gọi API:", error);
            document.getElementById('qsStatusColor').innerText = "Mất kết nối!";
        }
    });
});


/* =========================================
   3. CHATBOT LOGIC
   ========================================= */
window.toggleChat = function () {
    const chatWindow = document.getElementById('chatWindow');
    if (chatWindow.style.display === 'none' || chatWindow.style.display === '') {
        chatWindow.style.display = 'flex';
        document.getElementById('userInput').focus();
    } else {
        chatWindow.style.display = 'none';
    }
}

window.handleEnter = function (e) {
    if (e.key === 'Enter') sendMessage();
}

window.sendMessage = async function () {
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
        const loader = document.getElementById(loadingId);
        if (loader) loader.remove();

        if (data.reply) {
            chatBox.innerHTML += `<div class="message bot">${data.reply}</div>`;
        } else {
            chatBox.innerHTML += `<div class="message bot text-danger">Lỗi format server</div>`;
        }
    } catch (error) {
        const loader = document.getElementById(loadingId);
        if (loader) loader.remove();
        chatBox.innerHTML += `<div class="message bot text-danger">Mất kết nối server!</div>`;
    }
    chatBox.scrollTop = chatBox.scrollHeight;
}


/* =========================================
   4. VẼ BIỂU ĐỒ TỪ API VỆ TINH (Dashboard)
   ========================================= */
let myChartInstance = null;

window.handleFilterChange = function () {
    document.getElementById('btnRender').click();
};

document.addEventListener('DOMContentLoaded', function () {
    const btnRender = document.getElementById('btnRender');
    if (!btnRender) return;

    btnRender.addEventListener('click', async function () {
        const metricSelect = document.getElementById('filterMetric');
        const timeSelect = document.getElementById('filterTime');
        const chartTypeSelect = document.getElementById('filterChartType'); // <-- Lấy dropdown mới thêm

        const metricValue = metricSelect.value;
        const timeRange = timeSelect.value;
        const chartType = chartTypeSelect.value; // <-- Lấy giá trị loại biểu đồ (line, bar, pie)

        const metricLabel = metricSelect.options[metricSelect.selectedIndex].text;
        const timeLabel = timeSelect.options[timeSelect.selectedIndex].text;

        document.getElementById('chartTitle').innerText = `Đang tải dữ liệu từ vệ tinh...`;

        try {
            const today = new Date();
            const endDate = today.toISOString().split('T')[0];

            let startDate = new Date();
            let pastDays = 1;

            if (timeRange === '7d') pastDays = 7;
            if (timeRange === '1m') pastDays = 30;

            startDate.setDate(today.getDate() - pastDays);
            const startDateString = startDate.toISOString().split('T')[0];

            const lat = 10.7756;
            const lon = 106.7019;
            const apiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&start_date=${startDateString}&end_date=${endDate}&hourly=pm10,pm2_5,european_aqi&timezone=Asia/Bangkok`;

            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error("Mất kết nối API");
            const rawData = await response.json();

            const hourlyData = rawData.hourly;
            let labels = [];
            let values = [];

            // Xử lý màu sắc cơ bản cho Line và Bar chart
            let chartColor = '#198754';
            let metricArray = hourlyData.european_aqi;

            if (metricValue === 'pm25') {
                metricArray = hourlyData.pm2_5;
                chartColor = '#fd7e14';
            } else if (metricValue === 'pm10') {
                metricArray = hourlyData.pm10;
                chartColor = '#0dcaf0';
            }

            // Xử lý dữ liệu theo thời gian (24h hoặc gom nhóm theo ngày)
            if (timeRange === '24h') {
                labels = hourlyData.time.slice(-24).map(t => t.substring(11, 16));
                values = metricArray.slice(-24);
            } else {
                let dailyData = {};
                for (let i = 0; i < hourlyData.time.length; i++) {
                    const dateOnly = hourlyData.time[i].substring(5, 10);
                    if (!dailyData[dateOnly]) dailyData[dateOnly] = { sum: 0, count: 0 };
                    dailyData[dateOnly].sum += metricArray[i];
                    dailyData[dateOnly].count += 1;
                }
                labels = Object.keys(dailyData);
                values = labels.map(day => (dailyData[day].sum / dailyData[day].count).toFixed(1));
            }

            // =====================================
            // TÙY BIẾN CHO TỪNG LOẠI BIỂU ĐỒ
            // =====================================
            let bgColors = chartColor + '33'; // Mặc định là màu trong suốt cho Line/Bar
            let borderColors = chartColor;

            // Nếu là biểu đồ Pie (Tròn), cần mảng nhiều màu khác nhau để phân biệt các lát cắt
            if (chartType === 'pie') {
                bgColors = labels.map((_, i) => `hsl(${(i * 360) / labels.length}, 70%, 60%)`);
                borderColors = '#ffffff'; // Viền trắng phân cách các lát cắt
            } else if (chartType === 'bar') {
                bgColors = chartColor + '80'; // Làm đậm màu cột lên chút xíu so với background của line
            }

            const ctx = document.getElementById('myChart').getContext('2d');
            if (myChartInstance) myChartInstance.destroy();

            // Khởi tạo Chart
            myChartInstance = new Chart(ctx, {
                type: chartType, // Truyền biến chartType ('line', 'bar', 'pie') vào đây
                data: {
                    labels: labels,
                    datasets: [{
                        label: `Chỉ số ${metricLabel}`,
                        data: values,
                        borderColor: borderColors,
                        backgroundColor: bgColors,
                        borderWidth: 2,
                        tension: 0.3, // Chỉ có tác dụng với Line
                        fill: chartType === 'line', // Chỉ biểu đồ Line mới tô màu dưới đáy
                        pointRadius: timeRange === '24h' ? 3 : 4 // Tùy biến độ lớn điểm cho Line
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: chartType === 'pie' ? 'right' : 'top' // Dời legend cho Pie
                        }
                    },
                    scales: chartType === 'pie' ? {} : { // Ẩn cột x/y nếu là biểu đồ tròn
                        x: { grid: { display: false } },
                        y: { beginAtZero: true }
                    }
                }
            });

            document.getElementById('chartTitle').innerText = `Biểu đồ ${metricLabel} - ${timeLabel}`;

        } catch (error) {
            console.error("Lỗi vẽ biểu đồ:", error);
            document.getElementById('chartTitle').innerText = "Lỗi kết nối máy chủ dữ liệu!";
        }
    });
});


/* =========================================
   5. MÔ PHỎNG ĐUA BIỂU ĐỒ (RACE CHARTS)
   ========================================= */
document.addEventListener('DOMContentLoaded', function () {
    const DATA_URL = './data/hcm_aqi_dataset.json';
    let chartInstances = [];
    let cachedRawData = null;

    const btnPlay = document.getElementById('btnPlayRace');
    if (!btnPlay) return;

    btnPlay.addEventListener('click', function () {
        btnPlay.innerHTML = '<span class="spinner-grow spinner-grow-sm me-2 align-middle"></span> Đang chạy...';
        btnPlay.style.opacity = '0.8';
        btnPlay.disabled = true;

        chartInstances.forEach(chart => chart.dispose());
        chartInstances = [];

        if (cachedRawData) {
            render6MiniCharts(cachedRawData);
            unlockButtonLater();
        } else {
            $.get(DATA_URL, function (_rawData) {
                cachedRawData = _rawData;
                render6MiniCharts(_rawData);
                unlockButtonLater();
            }).fail(function () {
                alert("Không tìm thấy file JSON data!");
                btnPlay.innerHTML = '<i class="bi bi-exclamation-triangle me-1"></i> Lỗi dữ liệu';
            });
        }
    });

    function unlockButtonLater() {
        setTimeout(() => {
            btnPlay.innerHTML = '<i class="bi bi-arrow-counterclockwise me-1 fs-5 align-middle"></i> Chạy lại lần nữa';
            btnPlay.style.opacity = '1';
            btnPlay.disabled = false;
        }, 20000);
    }

    function render6MiniCharts(_rawData) {
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
                animationDuration: 20000,
                dataset: { source: _rawData },
                tooltip: { trigger: 'axis' },
                grid: { top: 25, bottom: 25, left: 35, right: 60 },
                xAxis: {
                    type: 'category',
                    axisLabel: {
                        formatter: function (value) {
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
                    encode: { x: 'Month', y: config.indicator },
                    showSymbol: false,
                    lineStyle: { width: 3, color: config.color },
                    itemStyle: { color: config.color },
                    markLine: {
                        symbol: ['none', 'none'],
                        label: { show: true, position: 'end', formatter: 'WHO: {c}', color: 'red', fontSize: 10, fontWeight: 'bold' },
                        lineStyle: { color: 'red', type: 'dashed', width: 1.5 },
                        data: [{ yAxis: config.threshold }]
                    },
                    endLabel: {
                        show: true,
                        formatter: function (params) {
                            let val = params.value[colIndex];
                            return val ? Number(val).toFixed(1) : '';
                        },
                        fontSize: 12, fontWeight: 'bold', color: config.color
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


/* =========================================
   6. BIỂU ĐỒ HOA GIÓ (WIND ROSE CHARTS)
   ========================================= */
document.addEventListener('DOMContentLoaded', function () {
    const windInstances = [];

    $.get('./data/hcm_wind_dataset.json', function (data) {
        const targets = [
            { m: 1, y: 2023 }, { m: 1, y: 2024 }, { m: 1, y: 2025 },
            { m: 6, y: 2023 }, { m: 6, y: 2024 }, { m: 6, y: 2025 },
            { m: 12, y: 2023 }, { m: 12, y: 2024 }, { m: 12, y: 2025 }
        ];

        targets.forEach(function (target) {
            const domId = `wind-m${target.m}-y${target.y}`;
            const dom = document.getElementById(domId);
            if (!dom) return;

            const key = `m${target.m}_y${target.y}`;
            const chartData = data.grid[key];

            const myChart = echarts.init(dom);
            windInstances.push(myChart);

            if (!chartData) {
                myChart.setOption({
                    title: { text: 'Chưa có dữ liệu', left: 'center', top: 'center', textStyle: { fontSize: 12, color: '#999' } }
                });
                return;
            }

            const seriesConfig = data.legend.map((name, index) => ({
                type: 'bar',
                data: chartData.series_data[index],
                coordinateSystem: 'polar',
                name: name,
                stack: 'wind'
            }));

            const option = {
                color: ['#a2d2ff', '#5c9ce6', '#2b65bd', '#123473'],
                tooltip: { trigger: 'item', formatter: '{a} <br/>{b}: {c} giờ' },
                legend: { show: false },
                polar: { radius: '65%' },
                angleAxis: {
                    type: 'category',
                    data: data.directions,
                    boundaryGap: false,
                    splitLine: { show: true, lineStyle: { color: '#eee' } },
                    axisLine: { show: false },
                    axisLabel: { interval: 3, fontSize: 9 }
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
        console.error("Lỗi tải file hcm_wind_dataset.json");
    });

    window.addEventListener('resize', function () {
        windInstances.forEach(chart => chart.resize());
    });
});